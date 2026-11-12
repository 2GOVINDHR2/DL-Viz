/** Shared Level 1 primitives. Each one is keyboard-operable, labelled, and never conveys state by colour alone. */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { Instruction } from '../../core/npm/ir';
import type { Role } from '../design/tokens';
import { fmt } from '../format';

export function Swatch({ role }: { role: Role }) {
  return <span className={`lv-swatch lv-role-${role}`} aria-hidden="true" />;
}

/**
 * A numeric control: a slider and an exact number field, with the previous value shown beside the new one so the
 * consequence of a change can be compared ("was 0.50").
 */
export function ValueSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  role,
  tour,
  control,
  digits = 2,
  hint,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  role?: Role;
  tour?: string;
  control?: string;
  digits?: number;
  hint?: string;
}) {
  const id = useId();
  const [was, setWas] = useState<number | null>(null);
  const [text, setText] = useState(String(value));
  const [bad, setBad] = useState<string | null>(null);
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      setWas(last.current);
      last.current = value;
    }
    setText(String(+value.toFixed(6)));
    setBad(null);
  }, [value]);
  const commit = (raw: string): void => {
    const v = Number(raw.replace('−', '-'));
    if (raw.trim() === '' || !Number.isFinite(v)) {
      setBad('Enter a number.');
      return;
    }
    if (v < min || v > max) {
      setBad(`Enter a number from ${fmt(min, 2)} to ${fmt(max, 2)}.`);
      return;
    }
    setBad(null);
    if (v !== value) onChange(v);
  };
  return (
    <div className={`lv-control${role ? ` lv-role-${role}` : ''}`} data-tour={tour}>
      <label className="lv-control-label" htmlFor={`${id}-range`}>
        {role && <Swatch role={role} />}
        {label}
      </label>
      <input
        className="lv-control-num"
        aria-label={typeof label === 'string' ? `${label}, exact value` : 'exact value'}
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit((e.target as HTMLInputElement).value);
        }}
        aria-invalid={bad ? true : undefined}
        aria-describedby={bad ? `${id}-err` : undefined}
        data-control={control ? `${control}:exact` : undefined}
      />
      <input
        id={`${id}-range`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={fmt(value, digits)}
        data-control={control}
      />
      <div className="lv-control-was" aria-live="polite">
        {bad ? (
          <span id={`${id}-err`} role="alert">
            {bad}
          </span>
        ) : was !== null ? (
          <>
            was <span className="lv-mono">{fmt(was, digits)}</span>
          </>
        ) : (
          (hint ?? '')
        )}
      </div>
    </div>
  );
}

export function Segmented<T extends string | number>({
  legend,
  options,
  value,
  onChange,
  tour,
  control,
  hideLegend,
}: {
  legend: string;
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  tour?: string;
  control?: string;
  hideLegend?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className="lv-segfield" data-tour={tour} style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className={hideLegend ? 'lv-visually-hidden' : 'lv-control-label'} style={{ marginBottom: 6 }}>
        {legend}
      </legend>
      <div className="lv-seg">
        {options.map((o) => (
          <label key={String(o.value)}>
            <input
              type="radio"
              name={name}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              data-control={control ? `${control}:${o.value}` : undefined}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A collapsed-by-default disclosure: advanced detail lives here. */
export function Disclosure({
  summary,
  children,
  tour,
  onOpen,
  defaultOpen = false,
}: {
  summary: ReactNode;
  children: ReactNode;
  tour?: string;
  onOpen?: () => void;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="lv-details"
      data-tour={tour}
      open={defaultOpen || undefined}
      onToggle={(e) => {
        if ((e.target as HTMLDetailsElement).open) onOpen?.();
      }}
    >
      <summary>{summary}</summary>
      <div className="lv-details-body">{children}</div>
    </details>
  );
}

/** Marks values that were read from a real engine run, and states how many instructions that run recorded. */
export function EngineBadge({ instructions, text }: { instructions?: number; text?: string }) {
  return (
    <span
      className="lv-badge-engine"
      title="Every number here was computed by the DL-VizLab engine and read back from its record of the run."
    >
      {text ?? 'Computed by the engine'}
      {instructions !== undefined && <span className="lv-muted"> · {instructions} steps recorded</span>}
    </span>
  );
}

/** Marks a simplified illustration that is not engine output. */
export function DemoBadge({ text = 'Illustration, not engine output' }: { text?: string }) {
  return <span className="lv-badge-demo">{text}</span>;
}

export function ErrorNote({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="lv-error" role="alert">
      <strong>{title}</strong>
      {children && <div>{children}</div>}
    </div>
  );
}

/** A term with its definition, shown on demand (contextual tooltip, keyboard and touch operable). */
export function Term({ children, meaning }: { children: ReactNode; meaning: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="lv-term" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
      >
        {children}
      </button>
      {open && (
        <span role="tooltip" id={id} className="lv-term-pop">
          {meaning}
        </span>
      )}
    </span>
  );
}

const KIND_WORDS: Record<string, string> = {
  INIT_PARAM: 'set a starting parameter value',
  LOAD_INPUT: 'load one example (its inputs and target)',
  MATMUL: 'multiply inputs by weights and add them up',
  ADD_BIAS: 'add the bias',
  ACTIVATE: 'apply the activation function',
  FORWARD_LAYER_END: 'finish this layer',
  COMPUTE_LOSS: 'compare the prediction with the target (loss)',
  LOSS_REDUCE: 'average the loss over the batch',
  GRAD_INIT: 'start working backwards from the loss',
  GRAD_ACTIVATE: 'pass the adjustment signal back through the activation',
  GRAD_MATMUL_W: 'work out how each weight should change',
  GRAD_MATMUL_X: 'pass the adjustment signal to the previous layer',
  GRAD_BIAS: 'work out how each bias should change',
  BACKWARD_LAYER_END: 'finish this layer (backwards)',
  GRAD_ACCUMULATE: 'average the adjustments over the batch',
  OPTIMIZER_STATE: 'update the running average of past steps (momentum)',
  COMPUTE_UPDATE: 'scale the adjustment by the learning rate',
  APPLY_UPDATE: 'apply the adjustment to the parameter',
  EPOCH_BEGIN: 'start an epoch (choose the order of examples)',
  EPOCH_END: 'finish the epoch',
  BATCH_BEGIN: 'start a batch',
  BATCH_END: 'finish the batch',
  EVAL_BEGIN: 'start checking every example',
  EVAL_END: 'finish checking (loss, accuracy, decision boundary)',
};

/** Plain words for an instruction kind. */
export const kindWords = (kind: string): string => KIND_WORDS[kind] ?? kind.toLowerCase().replace(/_/g, ' ');

/** The instructions behind a value: the "record" disclosure that ties a number to the trace. */
export function RecordList({ instructions, max = 12 }: { instructions: Instruction[]; max?: number }) {
  const shown = instructions.slice(0, max);
  return (
    <div className="lv-table-wrap">
      <table className="lv-table lv-small">
        <caption>Steps in the engine’s record</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Step</th>
            <th scope="col">What it did</th>
            <th scope="col">Result</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((i) => {
            const r = Object.entries(i.results)[0];
            return (
              <tr key={i.id}>
                <td className="num">{i.id}</td>
                <td>
                  <code>{i.kind}</code>
                </td>
                <td>{kindWords(i.kind)}</td>
                <td className="num">
                  {r
                    ? `${r[0]} = ${
                        r[1].size <= 4
                          ? Array.from(r[1].data)
                              .map((v) => fmt(v, 3))
                              .join(', ')
                          : `[${r[1].shape.join('×')}]`
                      }`
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {instructions.length > max && (
        <p className="lv-small lv-muted">…and {instructions.length - max} more.</p>
      )}
    </div>
  );
}
