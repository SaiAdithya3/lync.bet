import { Input } from "../ui/Input";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: boolean;
}

export function AmountInput({
  value,
  onChange,
  placeholder = "0.00",
  label = "Amount (USD)",
  error,
}: AmountInputProps) {
  return (
    <Input
      type="number"
      min="0"
      step="0.01"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      label={label}
      error={error}
    />
  );
}
