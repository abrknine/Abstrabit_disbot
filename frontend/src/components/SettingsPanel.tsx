import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import { saveConfig } from "../store/config-slice";
import type { CommandConfig } from "../types";
import { Toggle } from "./Toggle";

export const SettingsPanel = () => {
  const { items, error } = useAppSelector((s) => s.config);

  return (
    <div>
      {error && <p className="mb-3 text-sm text-dred">{error}</p>}
      {items.map((config) => (
        <ConfigCard key={config.command} config={config} />
      ))}
    </div>
  );
};

const ConfigCard = ({ config }: { config: CommandConfig }) => {
  const dispatch = useAppDispatch();
  const saving = useAppSelector((s) => s.config.saving) === config.command;
  const [draft, setDraft] = useState(config);

  useEffect(() => setDraft(config), [config]);

  const dirty =
    draft.enabled !== config.enabled ||
    draft.mirrorEnabled !== config.mirrorEnabled ||
    (draft.replyTemplate ?? "") !== (config.replyTemplate ?? "");

  return (
    <div className="mb-3 max-w-2xl rounded-lg bg-secondary p-4">
      <p className="mb-3 font-semibold text-heading">
        <span className="rounded bg-tertiary px-1.5 py-0.5 text-dlink">/{config.command}</span>
      </p>

      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-[15px]">Command enabled</p>
          <p className="text-xs text-muted">When off, users get a "disabled" reply</p>
        </div>
        <Toggle on={draft.enabled} onChange={(v) => setDraft({ ...draft, enabled: v })} />
      </div>

      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-[15px]">Mirror to second channel</p>
          <p className="text-xs text-muted">Send a webhook notification for this command</p>
        </div>
        <Toggle on={draft.mirrorEnabled} onChange={(v) => setDraft({ ...draft, mirrorEnabled: v })} />
      </div>

      <div className="py-2">
        <p className="text-[15px]">Custom reply template</p>
        <p className="text-xs text-muted">
          Optional. Placeholders: {"{username}"} and {"{text}"}. Leave empty for the default reply.
        </p>
        <input
          value={draft.replyTemplate ?? ""}
          onChange={(e) => setDraft({ ...draft, replyTemplate: e.target.value || null })}
          placeholder="e.g. 📨 Got it {username}! We are on it: {text}"
          className="mt-1.5 w-full rounded-[3px] bg-tertiary p-2.5 text-sm text-normal outline-none"
        />
      </div>

      {dirty && (
        <div className="mt-3 flex items-center gap-2.5">
          <button
            onClick={() => dispatch(saveConfig(draft))}
            disabled={saving}
            className="rounded-[3px] bg-dgreen px-5 py-2 text-sm font-medium text-white hover:bg-[#1a8a4a] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button onClick={() => setDraft(config)} className="text-sm text-muted hover:underline">
            Reset
          </button>
        </div>
      )}
    </div>
  );
};
