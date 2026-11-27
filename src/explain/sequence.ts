/**
 * Explainers for the sequence and gated-cell kinds (Level 4, ADR-102). Like the built-ins, each reads only the
 * instruction and the values its operands reference.
 */
import type { Instruction } from '../core/npm/ir';
import type { Tensor } from '../core/tensor/tensor';
import { num, texVec } from './format';
import { type ExplainContext, registerExplainer } from './registry';

const main = (i: Instruction): Tensor => Object.values(i.results)[0];
const operand = (i: Instruction, ctx: ExplainContext, role: string): Tensor | null => {
  const o = i.operands.find((p) => p.role === role);
  return o ? ctx.value(o) : null;
};
const at = (i: Instruction): string =>
  i.meta.step === undefined ? '' : ` at time step ${String(i.meta.step)}`;
const inGate = (i: Instruction): string => (i.meta.gate ? ` (${String(i.meta.gate)})` : '');

registerExplainer('SELECT_STEP', (i) => ({
  general: `x_t = x[t]`,
  substituted: `x_{${String(i.meta.step)}} = ${texVec(main(i))}`,
  sentence: `The input of time step ${String(i.meta.step)} is taken out of the sequence; the recurrent layer reads the sequence one step at a time.`,
}));

registerExplainer('GRAD_SELECT_STEP', (i) => ({
  general: `\\frac{\\partial \\ell}{\\partial x}[t] = g`,
  substituted: `t = ${String(i.meta.step)}`,
  sentence: `The gradient of time step ${String(i.meta.step)}’s input is put back at its place in the sequence; the other steps get zero from this use.`,
}));

registerExplainer('ADD', (i) => ({
  general: `u = a + b`,
  substituted: `u = ${texVec(main(i))}`,
  sentence: `Two contributions are added${at(i)}${inGate(i)}: in a recurrent layer, the part from the input and the part from the previous hidden state.`,
}));

registerExplainer('MULTIPLY', (i) => ({
  general: `u = a \\odot b`,
  substituted: `u = ${texVec(main(i))}`,
  sentence: `Two vectors are multiplied element by element${at(i)}${inGate(i)}. A gate between 0 and 1 multiplied with a value lets through that share of it.`,
}));

registerExplainer('GRAD_MULTIPLY', (i, ctx) => {
  const a = operand(i, ctx, 'a');
  const b = operand(i, ctx, 'b');
  return {
    general: `\\frac{\\partial \\ell}{\\partial a} = g \\odot b,\\quad \\frac{\\partial \\ell}{\\partial b} = g \\odot a`,
    substituted: `${a ? `a = ${texVec(a)}` : ''}${a && b ? ',\; ' : ''}${b ? `b = ${texVec(b)}` : ''}`,
    sentence: `Each factor of an element-by-element product receives the upstream gradient times the other factor${at(i)}${inGate(i)}.`,
  };
});

registerExplainer('ONE_MINUS', (i) => ({
  general: `u = 1 - a`,
  substituted: `u = ${texVec(main(i))}`,
  sentence: `The complement 1 − z of the gate${at(i)}: the share the gate does not let through.`,
}));

registerExplainer('GRAD_ONE_MINUS', (i) => ({
  general: `\\frac{\\partial \\ell}{\\partial a} = -g`,
  substituted: `${texVec(main(i))}`,
  sentence: `The gradient through 1 − z is the upstream gradient with its sign reversed${at(i)}.`,
}));

registerExplainer('STOP_GRADIENT', (i) => ({
  general: `h \\mapsto h,\\quad \\frac{\\partial \\ell}{\\partial h} := 0`,
  substituted: `h = ${texVec(main(i))}`,
  sentence: `The previous hidden state is used unchanged${at(i)}, but the backward pass stops here: this is where truncated backpropagation cuts the chain of time steps.`,
}));

registerExplainer('GRAD_SUM', (i) => {
  const n = Number(i.meta.uses);
  const g = main(i);
  return {
    general: `g = \\sum_{k=1}^{${n}} g_k`,
    substituted: `g = ${texVec(g)}`,
    sentence: i.meta.param
      ? `This parameter was used ${n} times in this example (once per time step), so its gradient is the sum of the ${n} contributions.`
      : `This value was used in ${n} places${at(i)}, so its gradient is the sum of the ${n} contributions (largest entry ${num(Math.max(...Array.from(g.data).map(Math.abs)))}).`,
  };
});
