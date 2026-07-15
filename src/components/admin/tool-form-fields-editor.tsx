"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmptyFormField,
  type ToolFormField,
} from "@/lib/tool-form-fields";

interface ToolFormFieldsEditorProps {
  fields: ToolFormField[];
  helpTitle: string;
  helpInstructions: string;
  onFieldsChange: (fields: ToolFormField[]) => void;
  onHelpTitleChange: (value: string) => void;
  onHelpInstructionsChange: (value: string) => void;
}

/**
 * Keeps the familiar single-field checkout setup by default.
 * Extra inputs (e.g. IG username) are opt-in via "Add another field".
 */
export function ToolFormFieldsEditor({
  fields,
  helpTitle,
  helpInstructions,
  onFieldsChange,
  onHelpTitleChange,
  onHelpInstructionsChange,
}: ToolFormFieldsEditorProps) {
  const hasExtras = fields.length > 1 || Boolean(helpTitle.trim());
  const [showExtras, setShowExtras] = useState(hasExtras);

  const primary = fields[0];
  const extraFields = fields.slice(1);

  function updateField(id: string, patch: Partial<ToolFormField>) {
    onFieldsChange(
      fields.map((field) => (field.id === id ? { ...field, ...patch } : field))
    );
  }

  function removeField(id: string) {
    if (fields.length <= 1) return;
    onFieldsChange(fields.filter((field) => field.id !== id));
  }

  function addField() {
    setShowExtras(true);
    onFieldsChange([
      ...fields,
      createEmptyFormField({
        label: "",
        placeholder: "",
        hint: "",
        required: true,
      }),
    ]);
  }

  if (!primary) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
      <div>
        <p className="text-sm font-medium text-zinc-300">What customers enter</p>
        <p className="text-xs text-zinc-500 mt-1">
          Same simple setup as before for activations. Change the label and placeholder
          for other tools (e.g. Instagram username) — or add more fields if needed.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Input
          label="Field label"
          value={primary.label}
          onChange={(e) => updateField(primary.id, { label: e.target.value })}
          placeholder="IMEI"
          required
          hint="What the customer sees above the input"
        />
        <Input
          label="Placeholder"
          value={primary.placeholder}
          onChange={(e) =>
            updateField(primary.id, { placeholder: e.target.value })
          }
          placeholder="Enter 15-digit IMEI (dial *#06# on the phone)"
          hint="Grey text inside the empty input"
        />
        <div className="md:col-span-2">
          <Textarea
            label="Help instructions"
            value={helpInstructions}
            onChange={(e) => onHelpInstructionsChange(e.target.value)}
            placeholder={"Dial *#06# on the phone\nOr Settings → About → IMEI"}
            hint="Shown on the device page. Edit freely — or leave blank to hide."
          />
        </div>
      </div>

      <Input
        label="Hint under the input (optional)"
        value={primary.hint}
        onChange={(e) => updateField(primary.id, { hint: e.target.value })}
        placeholder="Dial *#06# on the phone or check Settings → About → IMEI"
      />

      {(showExtras || extraFields.length > 0) && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <Input
            label="Help panel title (optional)"
            value={helpTitle}
            onChange={(e) => onHelpTitleChange(e.target.value)}
            placeholder="How to find your IMEI"
            hint="Defaults to “How to find your {label}” if left blank"
          />

          {extraFields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-zinc-500">Extra field {index + 1}</p>
                <button
                  type="button"
                  onClick={() => removeField(field.id)}
                  className="rounded-lg p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                  aria-label="Remove field"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <Input
                  label="Label"
                  value={field.label}
                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                  placeholder="e.g. Account password"
                  required
                />
                <Input
                  label="Placeholder"
                  value={field.placeholder}
                  onChange={(e) =>
                    updateField(field.id, { placeholder: e.target.value })
                  }
                  placeholder="Optional grey hint text"
                />
                <div className="md:col-span-2">
                  <Input
                    label="Hint under input (optional)"
                    value={field.hint}
                    onChange={(e) => updateField(field.id, { hint: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={addField}>
          <Plus className="h-4 w-4" />
          Add another field
        </Button>
        {!showExtras && extraFields.length === 0 && (
          <button
            type="button"
            onClick={() => setShowExtras(true)}
            className="text-xs text-zinc-500 hover:text-zinc-300 px-1"
          >
            Customize help title…
          </button>
        )}
      </div>
    </div>
  );
}
