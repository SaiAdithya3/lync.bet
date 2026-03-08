use crate::error::AppError;
use crate::types::{OrderbookLevel, OrderbookResponse};
use sqlx::PgPool;

/// Off-chain orderbook + pricing engine.
///
/// # Pricing Model — Virtual Liquidity CPMM
///
/// Uses a constant-product style model with virtual liquidity to determine
/// share prices. This ensures:
///   - New markets start at exactly 50¢ YES / 50¢ NO
///   - Buying YES shares pushes YES price up and NO price down
///   - The more one side is bought, the more expensive it becomes
///   - Prices always sum to $1.00 (100¢)
///
/// The formula:
///   `yes_price = (yes_volume + K) / (yes_volume + no_volume + 2K) * 100`
///
/// Where K is a virtual liquidity parameter (in USDC micro-units).
/// Larger K = more price stability (harder to move the price).
///
/// After actual fills occur, we blend the CPMM price with the most recent
/// fill price for smoother transitions.
pub struct OrderbookService {
    db: PgPool,
}

/// Virtual liquidity parameter: $100 USDC (100_000_000 micro-units).
/// Controls how much buying power is needed to shift the price significantly.
/// With K=$100: spending $100 on YES moves price from 50¢ → ~66.7¢
const VIRTUAL_LIQUIDITY_K: i64 = 100_000_000;

impl OrderbookService {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    /// Full orderbook for a market: aggregated YES/NO bids + CPMM-derived prices.
    pub async fn get_orderbook(&self, market_id: i32) -> Result<OrderbookResponse, AppError> {
        let yes_bids: Vec<OrderbookRow> = sqlx::query_as(
            r#"
            SELECT price,
                   COALESCE(SUM(shares), 0)::bigint AS total_shares,
                   COUNT(*)::int                    AS order_count
            FROM orders
            WHERE market_id = $1 AND token = 'YES' AND status = 'pending'
            GROUP BY price
            ORDER BY price DESC
            LIMIT 10
            "#,
        )
        .bind(market_id)
        .fetch_all(&self.db)
        .await
        .map_err(AppError::Db)?;

        let no_bids: Vec<OrderbookRow> = sqlx::query_as(
            r#"
            SELECT price,
                   COALESCE(SUM(shares), 0)::bigint AS total_shares,
                   COUNT(*)::int                    AS order_count
            FROM orders
            WHERE market_id = $1 AND token = 'NO' AND status = 'pending'
            GROUP BY price
            ORDER BY price DESC
            LIMIT 10
            "#,
        )
        .bind(market_id)
        .fetch_all(&self.db)
        .await
        .map_err(AppError::Db)?;

        // Most recent fill price (for display + blending)
        let last_trade_price: Option<(i32, i32)> = sqlx::query_as(
            r#"
            SELECT yes_price, no_price
            FROM price_snapshots
            WHERE market_id = $1
            ORDER BY timestamp DESC
            LIMIT 1
            "#,
        )
        .bind(market_id)
        .fetch_optional(&self.db)
        .await
        .map_err(AppError::Db)?;

        let last_price = last_trade_price.map(|(y, _)| y);

        // Cumulative volume per side from the trades table (confirmed fills only)
        let volumes: (i64, i64) = self.get_side_volumes(market_id).await?;

        let (yes_price, no_price) =
            Self::compute_cpmm_price(volumes.0, volumes.1, last_trade_price);

        Ok(OrderbookResponse {
            market_id,
            bids: yes_bids
                .into_iter()
                .map(|r| OrderbookLevel {
                    price: r.price,
                    shares: r.total_shares,
                    orders: r.order_count,
                })
                .collect(),
            no_bids: no_bids
                .into_iter()
                .map(|r| OrderbookLevel {
                    price: r.price,
                    shares: r.total_shares,
                    orders: r.order_count,
                })
                .collect(),
            last_price,
            yes_price,
            no_price,
        })
    }

    /// Cumulative USDC volume spent on each side for this market.
    async fn get_side_volumes(&self, market_id: i32) -> Result<(i64, i64), AppError> {
        #[derive(sqlx::FromRow)]
        struct Vol {
            yes_vol: i64,
            no_vol: i64,
        }
        let v: Vol = sqlx::query_as(
            r#"
            SELECT
                COALESCE(SUM(CASE WHEN token = 'YES' THEN cost ELSE 0 END), 0)::bigint AS yes_vol,
                COALESCE(SUM(CASE WHEN token = 'NO'  THEN cost ELSE 0 END), 0)::bigint AS no_vol
            FROM trades
            WHERE market_id = $1 AND token IN ('YES', 'NO')
            "#,
        )
        .bind(market_id)
        .fetch_one(&self.db)
        .await
        .map_err(AppError::Db)?;

        Ok((v.yes_vol, v.no_vol))
    }

    /// CPMM pricing with virtual liquidity.
    ///
    /// `yes_price = round((yes_vol + K) / (yes_vol + no_vol + 2K) * 100)`
    ///
    /// If a last trade price exists, we blend 70% CPMM + 30% last trade
    /// for smoother price transitions.
    fn compute_cpmm_price(
        yes_vol: i64,
        no_vol: i64,
        last_trade: Option<(i32, i32)>,
    ) -> (i32, i32) {
        let k = VIRTUAL_LIQUIDITY_K;
        let numerator = yes_vol + k;
        let denominator = yes_vol + no_vol + 2 * k;

        let cpmm_yes = if denominator > 0 {
            ((numerator * 100) / denominator).clamp(1, 99) as i32
        } else {
            50
        };

        let yes_price = if let Some((last_yes, _)) = last_trade {
            // Blend: 70% CPMM-derived, 30% last fill price
            let blended = (cpmm_yes as i64 * 70 + last_yes as i64 * 30) / 100;
            blended.clamp(1, 99) as i32
        } else {
            cpmm_yes
        };

        (yes_price, 100 - yes_price)
    }

    /// Get the current implied price for a specific token side.
    pub async fn get_token_price(&self, market_id: i32, token: &str) -> Result<i32, AppError> {
        let ob = self.get_orderbook(market_id).await?;
        Ok(if token.to_uppercase() == "YES" {
            ob.yes_price
        } else {
            ob.no_price
        })
    }

    /// Record a price snapshot after a successful on-chain fill.
    pub async fn record_price_snapshot(
        &self,
        market_id: i32,
        fill_price_cents: i32,
        token: &str,
        volume: i64,
    ) -> Result<(), AppError> {
        let (yes_price, no_price) = if token.to_uppercase() == "YES" {
            (fill_price_cents, 100 - fill_price_cents)
        } else {
            (100 - fill_price_cents, fill_price_cents)
        };

        sqlx::query(
            r#"
            INSERT INTO price_snapshots (market_id, yes_price, no_price, volume_24h)
            VALUES ($1, $2, $3, $4)
            "#,
        )
        .bind(market_id)
        .bind(yes_price)
        .bind(no_price)
        .bind(volume)
        .execute(&self.db)
        .await
        .map_err(AppError::Db)?;

        Ok(())
    }

    /// Calculate shares from cost and price.
    ///   shares = floor(cost / (price / 100)) = cost * 100 / price
    ///   e.g. cost=5_000_000 ($5), price=72 → 6_944_444 shares
    pub fn cost_to_shares(cost: i64, price_cents: i32) -> i64 {
        if price_cents <= 0 || price_cents >= 100 {
            return 0;
        }
        (cost * 100) / (price_cents as i64)
    }

    /// Reverse: infer price from cost/shares as stored in the trades table.
    pub fn shares_to_price_cents(cost: i64, shares: i64) -> i32 {
        if shares == 0 {
            return 50;
        }
        ((cost * 100) / shares).clamp(1, 99) as i32
    }
}

#[derive(sqlx::FromRow)]
struct OrderbookRow {
    price: i32,
    total_shares: i64,
    order_count: i32,
}
