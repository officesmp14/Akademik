import { UseFormRegister, FieldErrors, FieldValues, Path } from "react-hook-form";

type Props<T extends FieldValues> = {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  errors?: FieldErrors<T>;
  type?: string;
  placeholder?: string;
  required?: boolean;
};

export function TextField<T extends FieldValues>({
  label,
  name,
  register,
  type = "text",
  placeholder,
  required,
}: Props<T>) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        {...register(name)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  );
}

export function TextareaField<T extends FieldValues>({ label, name, register }: Props<T>) {
  return (
    <div className="sm:col-span-2">
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <textarea
        rows={3}
        {...register(name)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  );
}

export function SelectField<T extends FieldValues>({
  label,
  name,
  register,
  options,
  required,
}: Props<T> & { options: string[] | { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        {...register(name)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="">Pilih...</option>
        {options.map((opt) =>
          typeof opt === "string" ? (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ) : (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )
        )}
      </select>
    </div>
  );
}
