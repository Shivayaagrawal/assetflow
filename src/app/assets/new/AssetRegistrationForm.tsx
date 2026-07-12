"use client";

import {
  useState,
  useTransition,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { registerAsset } from "@/features/assets/actions";

type CategoryOption = {
  id: string;
  name: string;
};

type FormState = {
  name: string;
  categoryId: string;
  serialNumber: string;
  acquisitionDate: string;
  acquisitionCost: string;
  location: string;
  isBookable: boolean;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const initialFormState: FormState = {
  name: "",
  categoryId: "",
  serialNumber: "",
  acquisitionDate: "",
  acquisitionCost: "",
  location: "",
  isBookable: false,
};

function validateForm(form: FormState) {
  const errors: FieldErrors = {};

  if (!form.name.trim()) errors.name = "Asset name is required";
  if (!form.categoryId.trim()) errors.categoryId = "Category is required";
  if (!form.serialNumber.trim()) errors.serialNumber = "Serial number is required";
  if (!form.acquisitionDate) {
    errors.acquisitionDate = "Acquisition date is required";
  } else if (Number.isNaN(new Date(form.acquisitionDate).getTime())) {
    errors.acquisitionDate = "Acquisition date must be valid";
  }
  if (!form.acquisitionCost.trim()) {
    errors.acquisitionCost = "Acquisition cost is required";
  } else if (Number(form.acquisitionCost) < 0) {
    errors.acquisitionCost = "Acquisition cost cannot be negative";
  }
  if (!form.location.trim()) errors.location = "Location is required";

  return errors;
}

export function AssetRegistrationForm({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<
    | { kind: "success"; text: string }
    | { kind: "error"; text: string }
    | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const hasCategories = categories.length > 0;

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setMessage(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateForm(form);
    setFieldErrors(errors);
    setMessage(null);

    if (Object.keys(errors).length > 0 || !hasCategories) {
      if (!hasCategories) {
        setMessage({
          kind: "error",
          text: "No asset categories are available yet. Ask the Organization Setup owner to create categories.",
        });
      }
      return;
    }

    startTransition(async () => {
      const result = await registerAsset({
        name: form.name,
        categoryId: form.categoryId,
        serialNumber: form.serialNumber,
        acquisitionDate: new Date(form.acquisitionDate),
        acquisitionCost: Number(form.acquisitionCost),
        location: form.location,
        isBookable: form.isBookable,
      });

      if (result.success) {
        setForm(initialFormState);
        setFieldErrors({});
        setMessage({
          kind: "success",
          text: `Asset registered successfully with tag ${result.data.assetTag}.`,
        });
        return;
      }

      setMessage({ kind: "error", text: result.error.message });
    });
  }

  const inputStyle: CSSProperties = {
    border: "1px solid #cfd6df",
    borderRadius: "8px",
    fontSize: "15px",
    padding: "11px 12px",
    width: "100%",
  };

  const labelStyle: CSSProperties = {
    color: "#263445",
    display: "block",
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "6px",
  };

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #dfe4ea",
        borderRadius: "8px",
        padding: "24px",
      }}
    >
      {!hasCategories ? (
        <div
          style={{
            background: "#fff8e5",
            border: "1px solid #f1d28a",
            borderRadius: "8px",
            color: "#6d4b00",
            marginBottom: "20px",
            padding: "12px 14px",
          }}
        >
          No asset categories are available. Asset Registration is ready, but it
          needs categories from the Organization Setup module before an asset can
          be saved.
        </div>
      ) : null}

      {message ? (
        <div
          role="status"
          style={{
            background: message.kind === "success" ? "#eaf8ef" : "#fdecec",
            border:
              message.kind === "success"
                ? "1px solid #b9e3c5"
                : "1px solid #f0b8b8",
            borderRadius: "8px",
            color: message.kind === "success" ? "#1f6b35" : "#9f2424",
            marginBottom: "20px",
            padding: "12px 14px",
          }}
        >
          {message.text}
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gap: "18px",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          <label>
            <span style={labelStyle}>Asset Name</span>
            <input
              style={inputStyle}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Dell Latitude 5440"
            />
            {fieldErrors.name ? <FieldError>{fieldErrors.name}</FieldError> : null}
          </label>

          <label>
            <span style={labelStyle}>Category</span>
            <select
              disabled={!hasCategories}
              style={inputStyle}
              value={form.categoryId}
              onChange={(event) => updateField("categoryId", event.target.value)}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {fieldErrors.categoryId ? (
              <FieldError>{fieldErrors.categoryId}</FieldError>
            ) : null}
          </label>

          <label>
            <span style={labelStyle}>Serial Number</span>
            <input
              style={inputStyle}
              value={form.serialNumber}
              onChange={(event) => updateField("serialNumber", event.target.value)}
              placeholder="SN-2026-001"
            />
            {fieldErrors.serialNumber ? (
              <FieldError>{fieldErrors.serialNumber}</FieldError>
            ) : null}
          </label>

          <label>
            <span style={labelStyle}>Acquisition Date</span>
            <input
              style={inputStyle}
              type="date"
              value={form.acquisitionDate}
              onChange={(event) => updateField("acquisitionDate", event.target.value)}
            />
            {fieldErrors.acquisitionDate ? (
              <FieldError>{fieldErrors.acquisitionDate}</FieldError>
            ) : null}
          </label>

          <label>
            <span style={labelStyle}>Acquisition Cost</span>
            <input
              min="0"
              step="0.01"
              style={inputStyle}
              type="number"
              value={form.acquisitionCost}
              onChange={(event) => updateField("acquisitionCost", event.target.value)}
              placeholder="1250.00"
            />
            {fieldErrors.acquisitionCost ? (
              <FieldError>{fieldErrors.acquisitionCost}</FieldError>
            ) : null}
          </label>

          <label>
            <span style={labelStyle}>Location</span>
            <input
              style={inputStyle}
              value={form.location}
              onChange={(event) => updateField("location", event.target.value)}
              placeholder="Bengaluru Office - Floor 4"
            />
            {fieldErrors.location ? (
              <FieldError>{fieldErrors.location}</FieldError>
            ) : null}
          </label>
        </div>

        <label
          style={{
            alignItems: "center",
            color: "#263445",
            display: "flex",
            fontSize: "15px",
            gap: "10px",
            marginTop: "18px",
          }}
        >
          <input
            checked={form.isBookable}
            onChange={(event) => updateField("isBookable", event.target.checked)}
            type="checkbox"
          />
          Shared/bookable resource
        </label>

        <div style={{ marginTop: "24px" }}>
          <button
            disabled={isPending || !hasCategories}
            style={{
              background: isPending || !hasCategories ? "#9aa6b2" : "#1f6feb",
              border: 0,
              borderRadius: "8px",
              color: "#ffffff",
              cursor: isPending || !hasCategories ? "not-allowed" : "pointer",
              fontSize: "15px",
              fontWeight: 700,
              padding: "12px 18px",
            }}
            type="submit"
          >
            {isPending ? "Registering..." : "Register Asset"}
          </button>
        </div>
      </form>
    </section>
  );
}

function FieldError({ children }: { children: ReactNode }) {
  return (
    <span style={{ color: "#b42318", display: "block", fontSize: "13px", marginTop: "6px" }}>
      {children}
    </span>
  );
}
