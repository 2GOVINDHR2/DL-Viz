/**
 * A small matrix of numbers as an accessible table (Level 4, ADR-101): each cell shows its value, shaded by sign and
 * size (positive: the input colour; negative: the bias colour), with optional highlighted cells and, when `onPick` is
 * given, cells that are buttons. The numbers are whatever the caller passes; the grid computes nothing.
 */
import { fmt } from '../../format';

export function MatrixGrid({
  values,
  rows,
  cols,
  caption,
  digits = 2,
  highlight,
  strong,
  picked,
  onPick,
  scale,
  control,
  hideCaption,
}: {
  values: readonly number[];
  rows: number;
  cols: number;
  caption: string;
  digits?: number;
  /** Cells outlined as part of the current selection (e.g. the patch under the kernel). */
  highlight?: ReadonlySet<number>;
  /** Cells marked as the ones that decided a result (e.g. the maximum of a pooling block). */
  strong?: ReadonlySet<number>;
  /** The cell currently chosen. */
  picked?: number;
  onPick?: (index: number) => void;
  /** Largest absolute value for shading; the grid's own maximum when omitted. */
  scale?: number;
  control?: string;
  hideCaption?: boolean;
}) {
  const max = scale ?? Math.max(1e-12, ...values.map((v) => Math.abs(v)));
  return (
    <table className="lv-mgrid" data-control={control}>
      <caption className={hideCaption ? 'lv-visually-hidden' : undefined}>{caption}</caption>
      <tbody>
        {Array.from({ length: rows }, (_, r) => (
          <tr key={r}>
            {Array.from({ length: cols }, (_, c) => {
              const k = r * cols + c;
              const v = values[k];
              const share = Math.min(1, Math.abs(v) / max);
              const style = {
                background: `color-mix(in srgb, ${v >= 0 ? 'var(--lv-input)' : 'var(--lv-bias)'} ${Math.round(share * 32)}%, var(--lv-surface))`,
              };
              const cls = [
                highlight?.has(k) ? 'lv-mgrid-hl' : '',
                strong?.has(k) ? 'lv-mgrid-strong' : '',
                picked === k ? 'lv-mgrid-picked' : '',
              ]
                .filter(Boolean)
                .join(' ');
              const label = `row ${r + 1}, column ${c + 1}: ${fmt(v, digits)}`;
              return (
                <td key={c} className={cls || undefined} style={style} data-cell={k}>
                  {onPick ? (
                    <button
                      type="button"
                      onClick={() => onPick(k)}
                      aria-pressed={picked === k}
                      aria-label={label}
                      data-control={control ? `${control}:${k}` : undefined}
                    >
                      {fmt(v, digits)}
                    </button>
                  ) : (
                    fmt(v, digits)
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
