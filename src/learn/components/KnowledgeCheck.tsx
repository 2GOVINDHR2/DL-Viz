/**
 * The one knowledge-check component (task §11). Questions come from the experiment's data. Questions whose answer
 * depends on the current settings are built by the experiment from engine results, so their feedback always
 * describes what is on screen. Feedback explains why an answer is right or wrong. Nothing is graded or stored beyond
 * this browser tab.
 */
import { useId, useState } from 'react';
import type { Question } from '../../experiments/level1';

export type LiveQuestion = Question & {
  /** When set, the question cannot be answered yet, and this says why (for example "Train the network first"). */
  unavailable?: string;
  /** Marks the question as built from the current engine results. */
  live?: boolean;
};

const KIND_LABEL: Record<Question['kind'], string> = {
  choice: 'Multiple choice',
  predict: 'Predict the output',
  scenario: 'Scenario',
  challenge: 'Challenge',
};

function QuestionCard({ q, onAnswer }: { q: LiveQuestion; onAnswer: (correct: boolean) => void }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const name = useId();
  const opt = chosen === null ? null : q.options[chosen];
  return (
    <fieldset className="lv-question" disabled={!!q.unavailable} data-question={q.id}>
      <legend>
        <span className="lv-qkind">
          {KIND_LABEL[q.kind]}
          {q.live ? ' · uses your current settings' : ''}
        </span>
        {q.prompt}
      </legend>
      {q.unavailable && <p className="lv-small lv-muted">{q.unavailable}</p>}
      {q.options.map((o, k) => (
        <label
          key={k}
          className="lv-option"
          data-state={chosen === k ? (o.correct ? 'right' : 'wrong') : undefined}
        >
          <input
            type="radio"
            name={name}
            checked={chosen === k}
            onChange={() => {
              setChosen(k);
              onAnswer(!!o.correct);
            }}
            data-control={`check:${q.id}:${k}`}
          />
          <span>{o.text}</span>
        </label>
      ))}
      <div aria-live="polite">
        {opt && (
          <div className="lv-feedback">
            <p>
              <strong className={opt.correct ? 'lv-mark-ok' : 'lv-mark-bad'}>
                {opt.correct ? 'Correct' : 'Not quite'}
              </strong>{' '}
              {opt.feedback}
            </p>
            {!opt.correct && <p className="lv-small lv-muted">You can choose another answer.</p>}
          </div>
        )}
      </div>
    </fieldset>
  );
}

export function KnowledgeCheck({
  questions,
  onComplete,
}: {
  questions: LiveQuestion[];
  onComplete?: () => void;
}) {
  const [right, setRight] = useState<Record<string, boolean>>({});
  const answered = Object.keys(right).length;
  const correct = Object.values(right).filter(Boolean).length;
  return (
    <div className="lv-quiz">
      {questions.map((q) => (
        <QuestionCard
          // A live question whose wording changes with the settings starts afresh.
          key={`${q.id}|${q.prompt}|${q.options.map((o) => o.text).join('|')}`}
          q={q}
          onAnswer={(ok) => {
            const next = { ...right, [q.id]: ok };
            setRight(next);
            if (Object.keys(next).length >= questions.filter((x) => !x.unavailable).length) onComplete?.();
          }}
        />
      ))}
      <p className="lv-small lv-muted" aria-live="polite">
        {answered === 0
          ? `${questions.length} questions. Choose an answer to see why it is right or wrong.`
          : `${correct} of ${answered} answered correctly so far. Nothing is recorded.`}
      </p>
    </div>
  );
}
