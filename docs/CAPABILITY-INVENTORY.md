# Capability Inventory

**What this is (Fix Round 5, Part 0).** Every capability of every screen, read from the running build by `tests/e2e/capabilities.spec.ts`:
- every experiment of the workbench, in both modes;
- every page of the Level 1 learning interface, and Experiment 04 after a real run at each level of detail;
- in two states, as opened and part-way through the run;
- with every disclosure section open.

Numbers are shown as `#`, so an entry means the same capability whatever values the run holds.

**It is generated, not written by hand.** Regenerate it with `CAPTURE=1 npx playwright test tests/e2e/capabilities.spec.ts`, which also writes the JSON baseline (`reports/capability-inventory.json`). `CAPTURE=append` adds only screens new to the baseline and leaves every existing entry as it was (ADR-086); the Level 1 screens were added this way.

**How it protects the baseline.** Without `CAPTURE`, the same test fails if any baseline capability is missing from the current build, unless `reports/capability-removed.json` lists it with the ADR that removed it. A capability can be removed deliberately; it cannot disappear silently.

**Totals:** 3784 capabilities over 48 screens.

**What it does not cover.** States that appear only after a particular interaction (a revealed prediction, a pinned comparison) are not captured here. They are covered by the e2e tests named in PROGRESS, Fix Round 5.

## activations (expert)

**Panels** (11)

- Check your understanding
- Execution controls
- Experiment panels
- Explanation
- Guided walkthrough
- Inspector
- Network structure view
- Neural execution view
- Starting weights and biases
- Training state view
- Try it

**Controls (data-control id, element, accessible name)** (70)

- back (button): ◀ Back
- breakpoint:deadRelu (checkbox): a ReLU unit is inactive for a whole epoch
- breakpoint:exploding (checkbox): a gradient explodes (any /g/ > #)
- breakpoint:gradInit (checkbox): back-propagation starts (each example)
- breakpoint:lossIncrease (checkbox): the epoch loss rises by more than # %
- breakpoint:lossPlateau (checkbox): the epoch loss stops decreasing
- breakpoint:nonFinite (checkbox): NaN or infinity appears
- breakpoint:vanishing (checkbox): a layer’s gradient vanishes (all /g/ < #⁻⁴)
- chart:heatmap (rect): Epoch # weights into the output layer: gradient size #
- chart:pick (svg): Accuracy per epoch. training set: latest #.
- chart:pick (svg): Accuracy per epoch. training set: no data yet.
- chart:pick (svg): Loss per epoch. training (running mean): latest #; evaluation (end of epoch): latest #.
- chart:pick (svg): Loss per epoch. training (running mean): no data yet; evaluation (end of epoch): no data yet.
- chart:table (summary): Table view of the epoch data
- explain:detailed (button): Detailed
- explain:maths (button): Show the maths
- explain:novice (button): Simple
- explain:numbers (button): Show this step's numbers
- export:caption (textarea): Caption
- export:csv (button): Forward pass — step: download CSV data
- export:csv (button): Network architecture: download CSV data
- export:csv (button): The training run as a trace of instructions: download CSV data
- export:mode (button): Colour
- export:mode (button): Greyscale
- export:mode (button): High contrast
- export:open (summary): Export figures
- export:pdf (button): Forward pass — step: save as PDF via the print dialog
- export:pdf (button): Network architecture: save as PDF via the print dialog
- export:pdf (button): The training run as a trace of instructions: save as PDF via the print dialog
- export:refresh (button): Refresh at current position
- export:svg (button): Forward pass — step: download SVG
- export:svg (button): Network architecture: download SVG
- export:svg (button): The training run as a trace of instructions: download SVG
- export:zip (button): All figures (.zip)
- param:L1.b (button): Biases of the output layerL#.b[#]▸
- param:L1.W (button): Weights into the output layerL#.W[#×#]▸
- params (section): Starting weights and biases
- play (button): ▶▶ Run
- reset-experiment (button): ↺ Reset experiment
- rewind (button): ⏮ Start
- scrub (range): Position
- select:edge (g): Weight from Input unit # to Output (sigmoid) unit #: #
- select:unit (g): Input, unit #: not yet computed
- select:unit (g): Input, unit #: value #
- select:unit (g): Output (sigmoid), unit #: not yet computed
- select:unit (g): Output (sigmoid), unit #: value # gradient #, bias #
- selfcheck:ac1 (radio): every z equally
- selfcheck:ac1 (radio): large positive z, where the output is largest
- selfcheck:ac1 (radio): z = # where it equals #
- selfcheck:ac2 (radio): a negative gradient, because z is negative
- selfcheck:ac2 (radio): the same gradient as an active unit
- selfcheck:ac2 (radio): zero gradient from this example
- speed (range): Speed
- step (button): Step ▶
- step-size:batch (button): Batch
- step-size:epoch (button): Epoch
- step-size:layer (button): Layer
- step-size:operation (button): Operation
- step-size:phase (button): Phase
- step-size:sample (button): Example
- structure:expand (button): L#dense · sigmoid→ [#]# params▸
- to-breakpoint (button): ⇥ To breakpoint
- tryit:0 (select): Activation
- tryit:1 (text): starting weight w
- tryit:1:slider (range): starting weight w (drag)
- tryit:2 (text): input x of the first example
- walkthrough:hide (button): Hide
- walkthrough:next (button): Next ▶
- walkthrough:prev (button): ◀ Previous
- walkthrough:show-me (button): Run to the activation

**Disclosure sections** (2)

- Export figures
- Table view of the epoch data

**Information shown (headings, captions, legends)** (23)

- figcaption: Accuracy per epoch
- figcaption: Activation function: sigmoid
- figcaption: Gradient magnitude per layer, by epoch
- figcaption: L# batch gradient
- figcaption: L# weights
- figcaption: Loss per epoch
- h2: Check your understanding
- h2: Export figures
- h2: Inspector
- h2: Network structure
- h2: Starting weights and biases
- h2: Step through training
- h2: Training so far
- h2: Try it
- h2: Walkthrough · # of #
- h2: What just happened
- h3: Distributions at this point
- h3: What changed since the previous step
- legend: #. A ReLU unit has z = # for an example. During back-propagation its incoming weights receive…
- legend: #. The sigmoid’s slope σ′(z) is largest at…
- legend: Pause automatically when…
- legend: Step size
- p: positive weight (solid) negative weight (dashed) · line thickness = /weight/ · number in each neuron = its current value

## activations (novice)

**Panels** (11)

- Check your understanding
- Execution controls
- Experiment panels
- Explanation
- Guided walkthrough
- Inspector
- Network structure view
- Neural execution view
- Starting weights and biases
- Training state view
- Try it

**Controls (data-control id, element, accessible name)** (49)

- back (button): ◀ Back
- breakpoint:deadRelu (checkbox): a ReLU unit is inactive for a whole epoch
- breakpoint:exploding (checkbox): a gradient explodes (any /g/ > #)
- breakpoint:gradInit (checkbox): back-propagation starts (each example)
- breakpoint:lossIncrease (checkbox): the epoch loss rises by more than # %
- breakpoint:lossPlateau (checkbox): the epoch loss stops decreasing
- breakpoint:nonFinite (checkbox): NaN or infinity appears
- breakpoint:vanishing (checkbox): a layer’s gradient vanishes (all /g/ < #⁻⁴)
- chart:heatmap (rect): Epoch # weights into the output layer: gradient size #
- chart:pick (svg): Accuracy per epoch. training set: latest #.
- chart:pick (svg): Accuracy per epoch. training set: no data yet.
- chart:pick (svg): Loss per epoch. training (running mean): latest #; evaluation (end of epoch): latest #.
- chart:pick (svg): Loss per epoch. training (running mean): no data yet; evaluation (end of epoch): no data yet.
- chart:table (summary): Table view of the epoch data
- explain:detailed (button): Detailed
- explain:maths (button): Show the maths
- explain:novice (button): Simple
- explain:numbers (button): Show this step's numbers
- more-controls (summary): More controls: pause automatically
- param:L1.b (button): Biases of the output layer[#]▸
- param:L1.W (button): Weights into the output layer[#×#]▸
- params (section): Starting weights and biases
- play (button): ▶▶ Run
- reset-experiment (button): ↺ Reset experiment
- rewind (button): ⏮ Start
- scrub (range): Position
- select:edge (g): Weight from Input unit # to Output (sigmoid) unit #: #
- select:unit (g): Input, unit #: not yet computed
- select:unit (g): Input, unit #: value #
- select:unit (g): Output (sigmoid), unit #: not yet computed
- select:unit (g): Output (sigmoid), unit #: value # gradient #, bias #
- selfcheck:ac1 (radio): every z equally
- selfcheck:ac1 (radio): large positive z, where the output is largest
- selfcheck:ac1 (radio): z = # where it equals #
- selfcheck:ac2 (radio): a negative gradient, because z is negative
- selfcheck:ac2 (radio): the same gradient as an active unit
- selfcheck:ac2 (radio): zero gradient from this example
- speed (range): Speed
- step (button): Step ▶
- structure:expand (button): The output layerdense · sigmoid→ [#]# params▸
- to-breakpoint (button): ⇥ To breakpoint
- tryit:0 (select): Activation
- tryit:1 (text): starting weight w
- tryit:1:slider (range): starting weight w (drag)
- tryit:2 (text): input x of the first example
- walkthrough:hide (button): Hide
- walkthrough:next (button): Next ▶
- walkthrough:prev (button): ◀ Previous
- walkthrough:show-me (button): Run to the activation

**Disclosure sections** (2)

- More controls: pause automatically
- Table view of the epoch data

**Information shown (headings, captions, legends)** (21)

- figcaption: Accuracy per epoch
- figcaption: Activation function: sigmoid
- figcaption: Gradient magnitude per layer, by epoch
- figcaption: L# batch gradient
- figcaption: L# weights
- figcaption: Loss per epoch
- h2: Check your understanding
- h2: Inspector
- h2: Network structure
- h2: Starting weights and biases
- h2: Step through training
- h2: Training so far
- h2: Try it
- h2: Walkthrough · # of #
- h2: What just happened
- h3: Distributions at this point
- h3: What changed since the previous step
- legend: #. A ReLU unit has z = # for an example. During back-propagation its incoming weights receive…
- legend: #. The sigmoid’s slope σ′(z) is largest at…
- legend: Pause automatically when…
- p: positive weight (solid) negative weight (dashed) · line thickness = /weight/ · number in each neuron = its current value

## backpropagation (expert)

**Panels** (10)

- Check your understanding
- Execution controls
- Explanation
- Guided walkthrough
- Inspector
- Network structure view
- Neural execution view
- Starting weights and biases
- Training state view
- Try it

**Controls (data-control id, element, accessible name)** (87)

- arch:activation (select): Activation of hidden layer #relutanhsigmoidlinear
- arch:add (button): + add hidden layer
- arch:apply (button): Apply and restart
- arch:epochs (text): Epochs
- arch:lr (text): Learning rate
- arch:remove (button): Remove hidden layer #
- arch:restore (button): restore defaults
- arch:width (text): Width of hidden layer #
- back (button): ◀ Back
- breakpoint:deadRelu (checkbox): a ReLU unit is inactive for a whole epoch
- breakpoint:exploding (checkbox): a gradient explodes (any /g/ > #)
- breakpoint:gradInit (checkbox): back-propagation starts (each example)
- breakpoint:lossIncrease (checkbox): the epoch loss rises by more than # %
- breakpoint:lossPlateau (checkbox): the epoch loss stops decreasing
- breakpoint:nonFinite (checkbox): NaN or infinity appears
- breakpoint:vanishing (checkbox): a layer’s gradient vanishes (all /g/ < #⁻⁴)
- chart:heatmap (rect): Epoch # weights into hidden layer #: gradient size #
- chart:heatmap (rect): Epoch # weights into the output layer: gradient size #
- chart:pick (svg): Accuracy per epoch. training set: latest #.
- chart:pick (svg): Accuracy per epoch. training set: no data yet.
- chart:pick (svg): Loss per epoch. training (running mean): latest #; evaluation (end of epoch): latest #.
- chart:pick (svg): Loss per epoch. training (running mean): no data yet; evaluation (end of epoch): no data yet.
- chart:table (summary): Table view of the epoch data
- explain:detailed (button): Detailed
- explain:maths (button): Show the maths
- explain:novice (button): Simple
- explain:numbers (button): Show this step's numbers
- export:caption (textarea): Caption
- export:csv (button): Forward pass — gaussians: download CSV data
- export:csv (button): Network architecture: download CSV data
- export:csv (button): The training run as a trace of instructions: download CSV data
- export:mode (button): Colour
- export:mode (button): Greyscale
- export:mode (button): High contrast
- export:open (summary): Export figures
- export:pdf (button): Forward pass — gaussians: save as PDF via the print dialog
- export:pdf (button): Network architecture: save as PDF via the print dialog
- export:pdf (button): The training run as a trace of instructions: save as PDF via the print dialog
- export:refresh (button): Refresh at current position
- export:svg (button): Forward pass — gaussians: download SVG
- export:svg (button): Network architecture: download SVG
- export:svg (button): The training run as a trace of instructions: download SVG
- export:zip (button): All figures (.zip)
- param:L1.b (button): Biases of hidden layer #L#.b[#]▸
- param:L1.W (button): Weights into hidden layer #L#.W[#×#]▸
- param:L2.b (button): Biases of the output layerL#.b[#]▸
- param:L2.W (button): Weights into the output layerL#.W[#×#]▸
- params (section): Starting weights and biases
- play (button): ▶▶ Run
- reset-experiment (button): ↺ Reset experiment
- rewind (button): ⏮ Start
- scrub (range): Position
- select:edge (g): Weight from Hidden # (sigmoid) unit # to Output (sigmoid) unit #: #
- select:edge (g): Weight from Input unit # to Hidden # (sigmoid) unit #: #
- select:unit (g): Hidden # (sigmoid), unit #: not yet computed
- select:unit (g): Hidden # (sigmoid), unit #: value #, gradient #, bias #
- select:unit (g): Input, unit #: not yet computed
- select:unit (g): Input, unit #: value #
- select:unit (g): Output (sigmoid), unit #: not yet computed
- select:unit (g): Output (sigmoid), unit #: value #, gradient #, bias #
- selfcheck:bp1 (radio): layer #’s error signal and layer #’s weights
- selfcheck:bp1 (radio): layer #’s weights only
- selfcheck:bp1 (radio): the input features
- selfcheck:bp2 (radio): Because the forward pass changed the inputs
- selfcheck:bp2 (radio): Each layer’s gradient needs the gradient of the layer after it
- selfcheck:bp2 (radio): It is arbitrary
- speed (range): Speed
- step (button): Step ▶
- step-size:batch (button): Batch
- step-size:epoch (button): Epoch
- step-size:layer (button): Layer
- step-size:operation (button): Operation
- step-size:phase (button): Phase
- step-size:sample (button): Example
- structure:expand (button): L#dense · sigmoid→ [#]# params▸
- to-breakpoint (button): ⇥ To breakpoint
- tryit:0 (select): Activation of layer #
- tryit:1 (text): feature # of the first example
- tryit:2 (text): feature # of the first example
- tryit:3 (text): target of the first example (from # to #)
- tryit:4 (text): Learning rate η
- tryit:5 (text): Random seed (the starting point of the random numbers)
- tryit:more (summary): More settings
- walkthrough:hide (button): Hide
- walkthrough:next (button): Next ▶
- walkthrough:prev (button): ◀ Previous
- walkthrough:show-me (button): Run to the start of back-propagation

**Disclosure sections** (3)

- Export figures
- More settings
- Table view of the epoch data

**Information shown (headings, captions, legends)** (25)

- figcaption: Accuracy per epoch
- figcaption: Decision boundary
- figcaption: Decision boundary after epoch #
- figcaption: Gradient magnitude per layer, by epoch
- figcaption: L# batch gradient
- figcaption: L# weights
- figcaption: Loss per epoch
- h2: Check your understanding
- h2: Export figures
- h2: Inspector
- h2: Network structure
- h2: Starting weights and biases
- h2: Step through training
- h2: Training so far
- h2: Try it
- h2: Walkthrough · # of #
- h2: What just happened
- h3: Distributions at this point
- h3: What changed since the previous step
- legend: #. The gradient that reaches layer #’s output is computed from…
- legend: #. Why is the backward pass done from the output towards the input?
- legend: Change the network (restarts training)
- legend: Pause automatically when…
- legend: Step size
- p: positive weight (solid) negative weight (dashed) · line thickness = /weight/ · number in each neuron = its current value

## backpropagation (novice)

**Panels** (8)

- Check your understanding
- Going deeper
- Inspector
- Neural execution view
- Starting weights and biases
- The network
- Training state view
- Your settings

**Controls (data-control id, element, accessible name)** (44)

- back (button): ◀ Back
- chart:pick (svg): Accuracy per epoch. training set: no data yet.
- chart:pick (svg): Loss per epoch. training (running mean): no data yet; evaluation (end of epoch): no data yet.
- chart:table (summary): Table view of the epoch data
- deeper:activation (button): ▾ Try another activation
- deeper:activation-select (select): Hidden activation sigmoidtanhrelu
- deeper:expert (button): ⧉ Open the full workbench (expert mode)
- deeper:maths (button): ▾ Show the maths
- deeper:numbers (button): ▾ Show the numbers
- deeper:second-view (button): ▾ Add the training charts
- deeper:settings (button): ▾ Change the weights, the example and the learning rate
- inspector:clear (button): Clear
- param:L1.b (button): Biases of hidden layer #[#]▸
- param:L1.W (button): Weights into hidden layer #[#×#]▸
- param:L2.b (button): Biases of the output layer[#]▸
- param:L2.W (button): Weights into the output layer[#×#]▸
- params (section): Starting weights and biases
- predict:option (button): ○ down
- predict:option (button): ○ hardly at all
- predict:option (button): ○ up
- reset-experiment (button): ↺ Reset experiment
- select:edge (g): Weight from Hidden # (sigmoid) unit # to Output (sigmoid) unit #: #
- select:edge (g): Weight from Input unit # to Hidden # (sigmoid) unit #: #
- select:unit (g): Hidden # (sigmoid), unit #: not yet computed
- select:unit (g): Hidden # (sigmoid), unit #: value #, bias #
- select:unit (g): Input, unit #: not yet computed
- select:unit (g): Input, unit #: value #
- select:unit (g): Output (sigmoid), unit #: not yet computed
- select:unit (g): Output (sigmoid), unit #: value #, bias #
- selfcheck:bp1 (radio): layer #’s error signal and layer #’s weights
- selfcheck:bp1 (radio): layer #’s weights only
- selfcheck:bp1 (radio): the input features
- selfcheck:bp2 (radio): Because the forward pass changed the inputs
- selfcheck:bp2 (radio): Each layer’s gradient needs the gradient of the layer after it
- selfcheck:bp2 (radio): It is arbitrary
- step (button): Next: forward / backward / update ▶
- step-size:layer (button): one layer
- step-size:operation (button): one calculation
- step-size:phase (button): forward / backward / update
- tryit:1 (text): feature # of the first example
- tryit:2 (text): feature # of the first example
- tryit:3 (text): target of the first example (from # to #)
- tryit:4 (text): Learning rate η
- tryit:5 (text): Random seed (the starting point of the random numbers)

**Disclosure sections** (7)

- going deeper: Add the training charts
- going deeper: Change the weights, the example and the learning rate
- going deeper: Open the full workbench (expert mode)
- going deeper: Show the maths
- going deeper: Show the numbers
- going deeper: Try another activation
- Table view of the epoch data

**Information shown (headings, captions, legends)** (22)

- figcaption: Accuracy per epoch
- figcaption: Decision boundary
- figcaption: Gradient magnitude per layer, by epoch
- figcaption: L# batch gradient
- figcaption: L# weights
- figcaption: Loss per epoch
- h2: Check your understanding
- h2: Starting weights and biases
- h2: The network gets an example a little wrong. Which of its weights are to blame, and by how much? Follow the error backwar
- h2: Training so far
- h2: Weight from input # to layer # neuron #
- h3: Connected elements
- h3: Distributions at this point
- h3: Follow one weight
- h3: Going deeper
- h3: In the trace
- h3: The chain rule for the weight from input # to hidden neuron # for example # the last one worked back through
- h3: The chain rule for the weight from input # to hidden neuron # for this example
- legend: #. The gradient that reaches layer #’s output is computed from…
- legend: #. Why is the backward pass done from the output towards the input?
- legend: Your prediction This example will push the weight you are following…
- p: positive weight (solid) negative weight (dashed) · line thickness = /weight/ · number in each neuron = its current value

## cnn-mnist (expert)

**Panels** (9)

- Check your understanding
- Convolution view
- Execution controls
- Explanation
- Guided walkthrough
- Inspector
- Network structure view
- Training state view
- Try it

**Controls (data-control id, element, accessible name)** (75)

- back (button): ◀ Back
- breakpoint:deadRelu (checkbox): a ReLU unit is inactive for a whole epoch
- breakpoint:exploding (checkbox): a gradient explodes (any /g/ > #)
- breakpoint:gradInit (checkbox): back-propagation starts (each example)
- breakpoint:lossIncrease (checkbox): the epoch loss rises by more than # %
- breakpoint:lossPlateau (checkbox): the epoch loss stops decreasing
- breakpoint:nonFinite (checkbox): NaN or infinity appears
- breakpoint:vanishing (checkbox): a layer’s gradient vanishes (all /g/ < #⁻⁴)
- chart:heatmap (rect): Epoch # kernels of hidden layer #: gradient size #
- chart:heatmap (rect): Epoch # weights into the output layer: gradient size #
- chart:pick (svg): Accuracy per epoch. training set: latest #; held-out test: latest #.
- chart:pick (svg): Accuracy per epoch. training set: no data yet.
- chart:pick (svg): Loss per epoch. training (running mean): latest #; evaluation (end of epoch): latest #; held-out test: latest #.
- chart:pick (svg): Loss per epoch. training (running mean): no data yet; evaluation (end of epoch): no data yet.
- chart:table (summary): Table view of the epoch data
- explain:detailed (button): Detailed
- explain:maths (button): Show the maths
- explain:novice (button): Simple
- explain:numbers (button): Show this step's numbers
- export:caption (textarea): Caption
- export:csv (button): Convolution feature maps — mnist#: download CSV data
- export:csv (button): Network architecture: download CSV data
- export:csv (button): The training run as a trace of instructions: download CSV data
- export:mode (button): Colour
- export:mode (button): Greyscale
- export:mode (button): High contrast
- export:open (summary): Export figures
- export:pdf (button): Convolution feature maps — mnist#: save as PDF via the print dialog
- export:pdf (button): Network architecture: save as PDF via the print dialog
- export:pdf (button): The training run as a trace of instructions: save as PDF via the print dialog
- export:refresh (button): Refresh at current position
- export:svg (button): Convolution feature maps — mnist#: download SVG
- export:svg (button): Network architecture: download SVG
- export:svg (button): The training run as a trace of instructions: download SVG
- export:zip (button): All figures (.zip)
- play (button): ▶▶ Run
- reset-experiment (button): ↺ Reset experiment
- rewind (button): ⏮ Start
- scrub (range): Position
- select:cell (svg): Channel #: #×# activations; click a cell to place the window. Selected cell none; arrow keys move it.
- select:cell (svg): Channel #: #×# activations; click a cell to place the window. Selected cell row # column #; arrow keys move it.
- selfcheck:cn1 (radio): # × #
- selfcheck:cn2 (radio): Each kernel’s # weights are shared across every position of the image
- selfcheck:cn2 (radio): Only the image border is connected
- selfcheck:cn2 (radio): Pooling removes most of the weights
- selfcheck:cn3 (radio): equally to all four positions
- selfcheck:cn3 (radio): nowhere, because pooling has no weights
- selfcheck:cn3 (radio): only to the position that held the maximum
- speed (range): Speed
- step (button): Step ▶
- step-size:batch (button): Batch
- step-size:epoch (button): Epoch
- step-size:layer (button): Layer
- step-size:operation (button): Operation
- step-size:phase (button): Phase
- step-size:sample (button): Example
- structure:expand (button): L#conv#d · relu→ [#×#×#]# params▸
- structure:expand (button): L#dense · softmax→ [#]# params▸
- structure:expand (button): L#flatten→ [#]no params▸
- structure:expand (button): L#pool→ [#×#×#]no params▸
- to-breakpoint (button): ⇥ To breakpoint
- tryit:0 (select): Activation of layer #
- tryit:1 (text): Learning rate η
- tryit:2 (text): Number of kernels
- tryit:3 (text): Kernel size (pixels per side)
- tryit:4 (text): Stride (pixels the window moves)
- tryit:5 (text): Padding (zero pixels added at each edge)
- tryit:6 (text): Batch size B
- tryit:7 (text): Epochs (passes over the data)
- tryit:8 (text): Random seed (the starting point of the random numbers)
- tryit:more (summary): More settings
- walkthrough:hide (button): Hide
- walkthrough:next (button): Next ▶
- walkthrough:prev (button): ◀ Previous
- walkthrough:show-me (button): Load a digit

**Disclosure sections** (3)

- Export figures
- More settings
- Table view of the epoch data

**Information shown (headings, captions, legends)** (28)

- figcaption: Accuracy per epoch
- figcaption: Gradient magnitude per layer, by epoch
- figcaption: L# batch gradient
- figcaption: L# weights
- figcaption: Loss per epoch
- h2: Check your understanding
- h2: Export figures
- h2: Inspector
- h2: Network structure
- h2: Step through training
- h2: Training so far
- h2: Try it
- h2: Walkthrough · # of #
- h2: What just happened
- h3: After pooling
- h3: Distributions at this point
- h3: Feature maps (after activation)
- h3: Feature maps (convolution output u)
- h3: Input
- h3: Kernels (L#)
- h3: Prediction
- h3: What changed since the previous step
- legend: #. A # × # kernel slides over a # × # image with stride # and no padding. How large is the feature map?
- legend: #. During back-propagation, a # × # max-pooling layer sends each gradient…
- legend: #. Why does this convolutional layer have only # × # + # = # parameters?
- legend: Pause automatically when…
- legend: Step size
- p: Orange = negative, blue = positive (each map scaled to its own largest magnitude); input pixels in grey. Click a feature

## cnn-mnist (novice)

**Panels** (9)

- Check your understanding
- Convolution view
- Execution controls
- Explanation
- Guided walkthrough
- Inspector
- Network structure view
- Training state view
- Try it

**Controls (data-control id, element, accessible name)** (60)

- back (button): ◀ Back
- breakpoint:deadRelu (checkbox): a ReLU unit is inactive for a whole epoch
- breakpoint:exploding (checkbox): a gradient explodes (any /g/ > #)
- breakpoint:gradInit (checkbox): back-propagation starts (each example)
- breakpoint:lossIncrease (checkbox): the epoch loss rises by more than # %
- breakpoint:lossPlateau (checkbox): the epoch loss stops decreasing
- breakpoint:nonFinite (checkbox): NaN or infinity appears
- breakpoint:vanishing (checkbox): a layer’s gradient vanishes (all /g/ < #⁻⁴)
- chart:heatmap (rect): Epoch # kernels of hidden layer #: gradient size #
- chart:heatmap (rect): Epoch # weights into the output layer: gradient size #
- chart:pick (svg): Accuracy per epoch. training set: latest #; held-out test: latest #.
- chart:pick (svg): Accuracy per epoch. training set: no data yet.
- chart:pick (svg): Loss per epoch. training (running mean): latest #; evaluation (end of epoch): latest #; held-out test: latest #.
- chart:pick (svg): Loss per epoch. training (running mean): no data yet; evaluation (end of epoch): no data yet.
- chart:table (summary): Table view of the epoch data
- explain:detailed (button): Detailed
- explain:maths (button): Show the maths
- explain:novice (button): Simple
- explain:numbers (button): Show this step's numbers
- more-controls (summary): More controls: pause automatically
- play (button): ▶▶ Run
- reset-experiment (button): ↺ Reset experiment
- rewind (button): ⏮ Start
- scrub (range): Position
- select:cell (svg): Channel #: #×# activations; click a cell to place the window. Selected cell none; arrow keys move it.
- select:cell (svg): Channel #: #×# activations; click a cell to place the window. Selected cell row # column #; arrow keys move it.
- selfcheck:cn1 (radio): # × #
- selfcheck:cn2 (radio): Each kernel’s # weights are shared across every position of the image
- selfcheck:cn2 (radio): Only the image border is connected
- selfcheck:cn2 (radio): Pooling removes most of the weights
- selfcheck:cn3 (radio): equally to all four positions
- selfcheck:cn3 (radio): nowhere, because pooling has no weights
- selfcheck:cn3 (radio): only to the position that held the maximum
- speed (range): Speed
- step (button): Step ▶
- step-size:batch (button): one batch
- step-size:epoch (button): one full pass
- step-size:layer (button): one layer
- step-size:operation (button): one calculation
- step-size:phase (button): forward / backward / update
- step-size:sample (button): one example
- structure:expand (button): Hidden layer #conv#d · relu→ [#×#×#]# params▸
- structure:expand (button): Hidden layer #flatten→ [#]no params▸
- structure:expand (button): Hidden layer #pool→ [#×#×#]no params▸
- structure:expand (button): The output layerdense · softmax→ [#]# params▸
- to-breakpoint (button): ⇥ To breakpoint
- tryit:0 (select): Activation of layer #
- tryit:1 (text): Learning rate η
- tryit:2 (text): Number of kernels
- tryit:3 (text): Kernel size (pixels per side)
- tryit:4 (text): Stride (pixels the window moves)
- tryit:5 (text): Padding (zero pixels added at each edge)
- tryit:6 (text): Batch size B
- tryit:7 (text): Epochs (passes over the data)
- tryit:8 (text): Random seed (the starting point of the random numbers)
- tryit:more (summary): More settings
- walkthrough:hide (button): Hide
- walkthrough:next (button): Next ▶
- walkthrough:prev (button): ◀ Previous
- walkthrough:show-me (button): Load a digit

**Disclosure sections** (3)

- More controls: pause automatically
- More settings
- Table view of the epoch data

**Information shown (headings, captions, legends)** (27)

- figcaption: Accuracy per epoch
- figcaption: Gradient magnitude per layer, by epoch
- figcaption: L# batch gradient
- figcaption: L# weights
- figcaption: Loss per epoch
- h2: Check your understanding
- h2: Inspector
- h2: Network structure
- h2: Step through training
- h2: Training so far
- h2: Try it
- h2: Walkthrough · # of #
- h2: What just happened
- h3: After pooling
- h3: Distributions at this point
- h3: Feature maps (after activation)
- h3: Feature maps (convolution output u)
- h3: Input
- h3: Kernels (L#)
- h3: Prediction
- h3: What changed since the previous step
- legend: #. A # × # kernel slides over a # × # image with stride # and no padding. How large is the feature map?
- legend: #. During back-propagation, a # × # max-pooling layer sends each gradient…
- legend: #. Why does this convolutional layer have only # × # + # = # parameters?
- legend: Pause automatically when…
- legend: Step size
- p: Orange = negative, blue = positive (each map scaled to its own largest magnitude); input pixels in grey. Click a feature

## forward-propagation (expert)

**Panels** (10)

- Check your understanding
- Execution controls
- Explanation
- Guided walkthrough
- Inspector
- Network structure view
- Neural execution view
- Starting weights and biases
- Training state view
- Try it

**Controls (data-control id, element, accessible name)** (84)

- arch:activation (select): Activation of hidden layer #relutanhsigmoidlinear
- arch:add (button): + add hidden layer
- arch:apply (button): Apply and restart
- arch:epochs (text): Epochs
- arch:lr (text): Learning rate
- arch:remove (button): Remove hidden layer #
- arch:restore (button): restore defaults
- arch:width (text): Width of hidden layer #
- back (button): ◀ Back
- breakpoint:deadRelu (checkbox): a ReLU unit is inactive for a whole epoch
- breakpoint:exploding (checkbox): a gradient explodes (any /g/ > #)
- breakpoint:gradInit (checkbox): back-propagation starts (each example)
- breakpoint:lossIncrease (checkbox): the epoch loss rises by more than # %
- breakpoint:lossPlateau (checkbox): the epoch loss stops decreasing
- breakpoint:nonFinite (checkbox): NaN or infinity appears
- breakpoint:vanishing (checkbox): a layer’s gradient vanishes (all /g/ < #⁻⁴)
- chart:heatmap (rect): Epoch # weights into hidden layer #: gradient size #
- chart:heatmap (rect): Epoch # weights into the output layer: gradient size #
- chart:pick (svg): Accuracy per epoch. training set: latest #.
- chart:pick (svg): Accuracy per epoch. training set: no data yet.
- chart:pick (svg): Loss per epoch. training (running mean): latest #; evaluation (end of epoch): latest #.
- chart:pick (svg): Loss per epoch. training (running mean): no data yet; evaluation (end of epoch): no data yet.
- chart:table (summary): Table view of the epoch data
- explain:detailed (button): Detailed
- explain:maths (button): Show the maths
- explain:novice (button): Simple
- explain:numbers (button): Show this step's numbers
- export:caption (textarea): Caption
- export:csv (button): Forward pass — gaussians: download CSV data
- export:csv (button): Network architecture: download CSV data
- export:csv (button): The training run as a trace of instructions: download CSV data
- export:mode (button): Colour
- export:mode (button): Greyscale
- export:mode (button): High contrast
- export:open (summary): Export figures
- export:pdf (button): Forward pass — gaussians: save as PDF via the print dialog
- export:pdf (button): Network architecture: save as PDF via the print dialog
- export:pdf (button): The training run as a trace of instructions: save as PDF via the print dialog
- export:refresh (button): Refresh at current position
- export:svg (button): Forward pass — gaussians: download SVG
- export:svg (button): Network architecture: download SVG
- export:svg (button): The training run as a trace of instructions: download SVG
- export:zip (button): All figures (.zip)
- param:L1.b (button): Biases of hidden layer #L#.b[#]▸
- param:L1.W (button): Weights into hidden layer #L#.W[#×#]▸
- param:L2.b (button): Biases of the output layerL#.b[#]▸
- param:L2.W (button): Weights into the output layerL#.W[#×#]▸
- params (section): Starting weights and biases
- play (button): ▶▶ Run
- reset-experiment (button): ↺ Reset experiment
- rewind (button): ⏮ Start
- scrub (range): Position
- select:edge (g): Weight from Hidden # (tanh) unit # to Output (sigmoid) unit #: #
- select:edge (g): Weight from Input unit # to Hidden # (tanh) unit #: #
- select:unit (g): Hidden # (tanh), unit #: not yet computed
- select:unit (g): Hidden # (tanh), unit #: value #, gradient #, bias #
- select:unit (g): Input, unit #: not yet computed
- select:unit (g): Input, unit #: value #
- select:unit (g): Output (sigmoid), unit #: not yet computed
- select:unit (g): Output (sigmoid), unit #: value #, gradient #, bias #
- selfcheck:fp1 (radio): #
- selfcheck:fp2 (radio): layer #’s outputs and layer #’s weights and biases
- selfcheck:fp2 (radio): the gradients from the last step
- selfcheck:fp2 (radio): the loss
- speed (range): Speed
- step (button): Step ▶
- step-size:batch (button): Batch
- step-size:epoch (button): Epoch
- step-size:layer (button): Layer
- step-size:operation (button): Operation
- step-size:phase (button): Phase
- step-size:sample (button): Example
- structure:expand (button): L#dense · sigmoid→ [#]# params▸
- structure:expand (button): L#dense · tanh→ [#]# params▸
- to-breakpoint (button): ⇥ To breakpoint
- tryit:0 (text): Units in hidden layer #
- tryit:1 (text): feature # of the first example
- tryit:2 (text): feature # of the first example
- tryit:3 (text): Random seed (the starting point of the random numbers)
- tryit:more (summary): More settings
- walkthrough:hide (button): Hide
- walkthrough:next (button): Next ▶
- walkthrough:prev (button): ◀ Previous
- walkthrough:show-me (button): Load the first example

**Disclosure sections** (3)

- Export figures
- More settings
- Table view of the epoch data

**Information shown (headings, captions, legends)** (25)

- figcaption: Accuracy per epoch
- figcaption: Decision boundary
- figcaption: Decision boundary after epoch #
- figcaption: Gradient magnitude per layer, by epoch
- figcaption: L# batch gradient
- figcaption: L# weights
- figcaption: Loss per epoch
- h2: Check your understanding
- h2: Export figures
- h2: Inspector
- h2: Network structure
- h2: Starting weights and biases
- h2: Step through training
- h2: Training so far
- h2: Try it
- h2: Walkthrough · # of #
- h2: What just happened
- h3: Distributions at this point
- h3: What changed since the previous step
- legend: #. Layer # has # neurons and the input has # features. How many weights does layer # have (not counting biases)?
- legend: #. To compute layer #’s output you need…
- legend: Change the network (restarts training)
- legend: Pause automatically when…
- legend: Step size
- p: positive weight (solid) negative weight (dashed) · line thickness = /weight/ · number in each neuron = its current value

## forward-propagation (novice)

**Panels** (10)

- Check your understanding
- Execution controls
- Explanation
- Guided walkthrough
- Inspector
- Network structure view
- Neural execution view
- Starting weights and biases
- Training state view
- Try it

**Controls (data-control id, element, accessible name)** (65)

- arch:activation (select): Activation of hidden layer #relutanhsigmoidlinear
- arch:add (button): + add hidden layer
- arch:apply (button): Apply and restart
- arch:epochs (text): Epochs
- arch:lr (text): Learning rate
- arch:remove (button): Remove hidden layer #
- arch:restore (button): restore defaults
- arch:width (text): Width of hidden layer #
- back (button): ◀ Back
- breakpoint:deadRelu (checkbox): a ReLU unit is inactive for a whole epoch
- breakpoint:exploding (checkbox): a gradient explodes (any /g/ > #)
- breakpoint:gradInit (checkbox): back-propagation starts (each example)
- breakpoint:lossIncrease (checkbox): the epoch loss rises by more than # %
- breakpoint:lossPlateau (checkbox): the epoch loss stops decreasing
- breakpoint:nonFinite (checkbox): NaN or infinity appears
- breakpoint:vanishing (checkbox): a layer’s gradient vanishes (all /g/ < #⁻⁴)
- chart:heatmap (rect): Epoch # weights into hidden layer #: gradient size #
- chart:heatmap (rect): Epoch # weights into the output layer: gradient size #
- chart:pick (svg): Accuracy per epoch. training set: latest #.
- chart:pick (svg): Accuracy per epoch. training set: no data yet.
- chart:pick (svg): Loss per epoch. training (running mean): latest #; evaluation (end of epoch): latest #.
- chart:pick (svg): Loss per epoch. training (running mean): no data yet; evaluation (end of epoch): no data yet.
- chart:table (summary): Table view of the epoch data
- explain:detailed (button): Detailed
- explain:maths (button): Show the maths
- explain:novice (button): Simple
- explain:numbers (button): Show this step's numbers
- more-controls (summary): More controls: pause automatically
- param:L1.b (button): Biases of hidden layer #[#]▸
- param:L1.W (button): Weights into hidden layer #[#×#]▸
- param:L2.b (button): Biases of the output layer[#]▸
- param:L2.W (button): Weights into the output layer[#×#]▸
- params (section): Starting weights and biases
- play (button): ▶▶ Run
- reset-experiment (button): ↺ Reset experiment
- rewind (button): ⏮ Start
- scrub (range): Position
- select:edge (g): Weight from Hidden # (tanh) unit # to Output (sigmoid) unit #: #
- select:edge (g): Weight from Input unit # to Hidden # (tanh) unit #: #
- select:unit (g): Hidden # (tanh), unit #: not yet computed
- select:unit (g): Hidden # (tanh), unit #: value #, gradient #, bias #
- select:unit (g): Input, unit #: not yet computed
- select:unit (g): Input, unit #: value #
- select:unit (g): Output (sigmoid), unit #: not yet computed
- select:unit (g): Output (sigmoid), unit #: value #, gradient #, bias #
- selfcheck:fp1 (radio): #
- selfcheck:fp2 (radio): layer #’s outputs and layer #’s weights and biases
- selfcheck:fp2 (radio): the gradients from the last step
- selfcheck:fp2 (radio): the loss
- speed (range): Speed
- step (button): Step ▶
- step-size:layer (button): one layer
- step-size:operation (button): one calculation
- structure:expand (button): Hidden layer #dense · tanh→ [#]# params▸
- structure:expand (button): The output layerdense · sigmoid→ [#]# params▸
- to-breakpoint (button): ⇥ To breakpoint
- tryit:0 (text): Units in hidden layer #
- tryit:1 (text): feature # of the first example
- tryit:2 (text): feature # of the first example
- tryit:3 (text): Random seed (the starting point of the random numbers)
- tryit:more (summary): More settings
- walkthrough:hide (button): Hide
- walkthrough:next (button): Next ▶
- walkthrough:prev (button): ◀ Previous
- walkthrough:show-me (button): Load the first example

**Disclosure sections** (3)

- More controls: pause automatically
- More settings
- Table view of the epoch data

**Information shown (headings, captions, legends)** (24)

- figcaption: Accuracy per epoch
- figcaption: Decision boundary
- figcaption: Decision boundary after epoch #
- figcaption: Gradient magnitude per layer, by epoch
- figcaption: L# batch gradient
- figcaption: L# weights
- figcaption: Loss per epoch
- h2: Check your understanding
- h2: Inspector
- h2: Network structure
- h2: Starting weights and biases
- h2: Step through training
- h2: Training so far
- h2: Try it
- h2: Walkthrough · # of #
- h2: What just happened
- h3: Distributions at this point
- h3: What changed since the previous step
- legend: #. Layer # has # neurons and the input has # features. How many weights does layer # have (not counting biases)?
- legend: #. To compute layer #’s output you need…
- legend: Change the network (restarts training)
- legend: Pause automatically when…
- legend: Step size
- p: positive weight (solid) negative weight (dashed) · line thickness = /weight/ · number in each neuron = its current value

## gradient-descent (expert)

**Panels** (10)

- Check your understanding
- Execution controls
- Experiment panels
- Explanation
- Guided walkthrough
- Inspector
- Network structure view
- Neural execution view
- Training state view
- Try it

**Controls (data-control id, element, accessible name)** (72)

- back (button): ◀ Back
- breakpoint:deadRelu (checkbox): a ReLU unit is inactive for a whole epoch
- breakpoint:exploding (checkbox): a gradient explodes (any /g/ > #)
- breakpoint:gradInit (checkbox): back-propagation starts (each example)
- breakpoint:lossIncrease (checkbox): the epoch loss rises by more than # %
- breakpoint:lossPlateau (checkbox): the epoch loss stops decreasing
- breakpoint:nonFinite (checkbox): NaN or infinity appears
- breakpoint:vanishing (checkbox): a layer’s gradient vanishes (all /g/ < #⁻⁴)
- chart:heatmap (rect): Epoch # weights into the output layer: gradient size #
- chart:pick (svg): Loss per epoch. training (running mean): latest #; evaluation (end of epoch): latest #.
- chart:pick (svg): Loss per epoch. training (running mean): no data yet; evaluation (end of epoch): no data yet.
- chart:table (summary): Table view of the epoch data
- explain:detailed (button): Detailed
- explain:maths (button): Show the maths
- explain:novice (button): Simple
- explain:numbers (button): Show this step's numbers
- export:caption (textarea): Caption
- export:csv (button): Forward pass — line: download CSV data
- export:csv (button): Network architecture: download CSV data
- export:csv (button): The training run as a trace of instructions: download CSV data
- export:mode (button): Colour
- export:mode (button): Greyscale
- export:mode (button): High contrast
- export:open (summary): Export figures
- export:pdf (button): Forward pass — line: save as PDF via the print dialog
- export:pdf (button): Network architecture: save as PDF via the print dialog
- export:pdf (button): The training run as a trace of instructions: save as PDF via the print dialog
- export:refresh (button): Refresh at current position
- export:svg (button): Forward pass — line: download SVG
- export:svg (button): Network architecture: download SVG
- export:svg (button): The training run as a trace of instructions: download SVG
- export:zip (button): All figures (.zip)
- play (button): ▶▶ Run
- reset-experiment (button): ↺ Reset experiment
- rewind (button): ⏮ Start
- scrub (range): Position
- select:edge (g): Weight from Input unit # to Output (linear) unit #: #
- select:unit (g): Input, unit #: not yet computed
- select:unit (g): Input, unit #: value #
- select:unit (g): Output (linear), unit #: not yet computed
- select:unit (g): Output (linear), unit #: value #, gradient #, bias #
- selfcheck:gd1 (radio): Because the loss is negative
- selfcheck:gd1 (radio): The gradient points uphill; we want to go downhill
- selfcheck:gd1 (radio): To keep the parameters small
- selfcheck:gd2 (radio): lower the learning rate
- selfcheck:gd2 (radio): raise the learning rate
- selfcheck:gd2 (radio): train for more epochs
- selfcheck:gd3 (radio): # update instead of # each more accurate
- selfcheck:gd3 (radio): # updates instead of # each based on a noisier gradient estimate
- selfcheck:gd3 (radio): Nothing changes, because the same # points are used
- speed (range): Speed
- step (button): Step ▶
- step-size:batch (button): Batch
- step-size:epoch (button): Epoch
- step-size:layer (button): Layer
- step-size:operation (button): Operation
- step-size:phase (button): Phase
- step-size:sample (button): Example
- structure:expand (button): L#dense · linear→ [#]# params▸
- to-breakpoint (button): ⇥ To breakpoint
- tryit:0 (text): Learning rate η
- tryit:1 (text): Batch size B
- tryit:2 (text): starting weight w
- tryit:2:slider (range): starting weight w (drag)
- tryit:3 (text): starting bias b
- tryit:3:slider (range): starting bias b (drag)
- tryit:4 (text): Epochs (passes over the data)
- tryit:more (summary): More settings
- walkthrough:hide (button): Hide
- walkthrough:next (button): Next ▶
- walkthrough:prev (button): ◀ Previous
- walkthrough:show-me (button): Step one batch

**Disclosure sections** (3)

- Export figures
- More settings
- Table view of the epoch data

**Information shown (headings, captions, legends)** (22)

- figcaption: Gradient magnitude per layer, by epoch
- figcaption: L# batch gradient
- figcaption: L# weights
- figcaption: Loss per epoch
- figcaption: Loss surface L(w, b) and the path of gradient descent
- h2: Check your understanding
- h2: Export figures
- h2: Inspector
- h2: Network structure
- h2: Step through training
- h2: Training so far
- h2: Try it
- h2: Walkthrough · # of #
- h2: What just happened
- h3: Distributions at this point
- h3: What changed since the previous step
- legend: #. The loss grows larger after every step. The most likely fix is to…
- legend: #. The update rule is θ ← θ − η·∂L/∂θ. Why the minus sign?
- legend: #. You change the batch size from # to # on these # points. What happens in each epoch?
- legend: Pause automatically when…
- legend: Step size
- p: positive weight (solid) negative weight (dashed) · line thickness = /weight/ · number in each neuron = its current value

## gradient-descent (novice)

**Panels** (5)

- Check your understanding
- Going deeper
- The loss surface
- Training state view
- Your settings

**Controls (data-control id, element, accessible name)** (33)

- back (button): ◀ Back
- chart:heatmap (rect): Epoch # weights into the output layer: gradient size #
- chart:pick (svg): Loss per epoch. training (running mean): latest #; evaluation (end of epoch): latest #.
- chart:pick (svg): Loss per epoch. training (running mean): no data yet; evaluation (end of epoch): no data yet.
- chart:table (summary): Table view of the epoch data
- deeper:expert (button): ⧉ Open the full workbench (expert mode)
- deeper:maths (button): ▾ Show the maths
- deeper:numbers (button): ▾ Show the numbers
- deeper:second-view (button): ▾ Add the loss-per-pass chart
- deeper:settings (button): ▾ Change the starting point and the passes
- jump-end (button): Jump to the end
- lr (button): η = #
- lr-typed (text): …or type any learning rate η
- passed (details): On the way: the network was checked on all the examples (#); pass # over the examples began.A check on all the examples 
- play (button): ▶ Watch it walk
- reset-experiment (button): ↺ Reset experiment
- selfcheck:gd1 (radio): Because the loss is negative
- selfcheck:gd1 (radio): The gradient points uphill; we want to go downhill
- selfcheck:gd1 (radio): To keep the parameters small
- selfcheck:gd2 (radio): lower the learning rate
- selfcheck:gd2 (radio): raise the learning rate
- selfcheck:gd2 (radio): train for more epochs
- selfcheck:gd3 (radio): # update instead of # each more accurate
- selfcheck:gd3 (radio): # updates instead of # each based on a noisier gradient estimate
- selfcheck:gd3 (radio): Nothing changes, because the same # points are used
- step (button): Next: one batch ▶
- step-size:batch (button): one batch
- step-size:sample (button): one example
- tryit:2 (text): starting weight w
- tryit:2:slider (range): starting weight w (drag)
- tryit:3 (text): starting bias b
- tryit:3:slider (range): starting bias b (drag)
- tryit:4 (text): Epochs (passes over the data)

**Disclosure sections** (7)

- going deeper: Add the loss-per-pass chart
- going deeper: Change the starting point and the passes
- going deeper: Open the full workbench (expert mode)
- going deeper: Show the maths
- going deeper: Show the numbers
- On the way: the network was checked on all the examples (#); pass # over the examples began.
- Table view of the epoch data

**Information shown (headings, captions, legends)** (15)

- caption: Loss over all # points after each pass
- figcaption: Gradient magnitude per layer, by epoch
- figcaption: L# batch gradient
- figcaption: L# weights
- figcaption: Loss per epoch
- figcaption: Loss surface L(w, b) and the path of gradient descent
- h2: Check your understanding
- h2: How does a model find the best straight line through # points? It starts with a bad line and walks downhill on its loss,
- h2: Training so far
- h3: Distributions at this point
- h3: Going deeper
- h3: Step size: the learning rate η
- legend: #. The loss grows larger after every step. The most likely fix is to…
- legend: #. The update rule is θ ← θ − η·∂L/∂θ. Why the minus sign?
- legend: #. You change the batch size from # to # on these # points. What happens in each epoch?

## learn: assessment

**Controls (data-control id, element, accessible name)** (24)

- check:a-batch:0 (radio): #
- check:a-batch:1 (radio): #
- check:a-batch:2 (radio): #
- check:a-boundary:0 (radio): The line of inputs where its weighted sum plus bias is exactly at the threshold
- check:a-boundary:1 (radio): The largest input it accepts
- check:a-boundary:2 (radio): The set of inputs it gets wrong
- check:a-linear:0 (radio): Without it, any stack of layers acts like a single linear layer
- check:a-linear:1 (radio): It makes training faster
- check:a-linear:2 (radio): It keeps the weights small
- check:a-neuron:0 (radio): #
- check:a-neuron:1 (radio): #
- check:a-neuron:2 (radio): #
- check:a-relu:0 (radio): #
- check:a-relu:1 (radio): #
- check:a-relu:2 (radio): #
- check:a-separable:0 (radio): XOR
- check:a-separable:1 (radio): AND
- check:a-separable:2 (radio): NOT
- check:a-trace:0 (radio): A record of every operation the engine performed during that run, which you can step through in both directions
- check:a-trace:1 (radio): An animation showing roughly what a network does
- check:a-trace:2 (radio): A summary of the final accuracy only
- check:a-training:0 (radio): Adjusting the parameters, using examples, so that predictions improve
- check:a-training:1 (radio): Choosing the number of layers
- check:a-training:2 (radio): Running the network on one input to see its answer

**Information shown (headings, captions, legends)** (8)

- legend: Multiple choiceWhat does ReLU output when z is #?
- legend: Multiple choiceWhat is a perceptron’s decision boundary?
- legend: Multiple choiceWhat is the training trace you explored in Experiment #?
- legend: Multiple choiceWhich sentence describes training?
- legend: Multiple choiceWhy do networks put a nonlinear activation between layers?
- legend: Predict the outputA neuron has inputs # and # weights # and # and bias #. What is its weighted sum z?
- legend: Predict the outputThere are # training examples and the batch size is #. How many batches are in one epoch?
- legend: ScenarioWhich of these gates can a single perceptron NOT implement?

## learn: experiment 01

**Panels** (4)

- Learning objectives
- Neuron controls
- Result
- What you will understand

**Controls (data-control id, element, accessible name)** (36)

- activation:relu (radio): ReLU
- activation:sigmoid (radio): Sigmoid
- activation:step (radio): Step
- activation:tanh (radio): Tanh
- b (range): Bias b
- b:exact (input): Bias b, exact value
- begin (a): Begin ↓
- check:n-live-relu:0 (radio): #
- check:n-live-relu:1 (radio): #
- check:n-live-relu:2 (radio): #
- check:n-live-step:0 (radio): #
- check:n-live-step:1 (radio): #
- check:n-stages:0 (radio): The weighted sum z: each input times its weight, added up, plus the bias
- check:n-stages:1 (radio): The output a
- check:n-stages:2 (radio): A new set of weights
- check:n-step:0 (radio): Step
- check:n-step:1 (radio): Sigmoid
- check:n-step:2 (radio): ReLU
- check:n-zero:0 (radio): Nothing: z stays the same
- check:n-zero:1 (radio): z goes up by #
- check:n-zero:2 (radio): z becomes #
- next-experiment (a): Next: # · Perceptrons and Logic Gates →
- primer:w (range): Weight w
- primer:w:exact (input): Weight w, exact value
- primer:x (range): Input x
- primer:x:exact (input): Input x, exact value
- reset (button): Reset to starting values
- tour:start (button): ▶ Start guided tour
- w1 (range): Weight w₁
- w1:exact (input): Weight w₁, exact value
- w2 (range): Weight w₂
- w2:exact (input): Weight w₂, exact value
- x1 (range): Input x₁
- x1:exact (input): Input x₁, exact value
- x2 (range): Input x₂
- x2:exact (input): Input x₂, exact value

**Disclosure sections** (3)

- See the engine’s record of this calculation
- Show the calculation
- Show the formula

**Information shown (headings, captions, legends)** (24)

- caption: Step by step, as the engine computed it
- caption: Steps in the engine’s record
- figcaption: Sigmoid: the orange marker is the current z. The output a is read off the curve.
- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: Flip a weight
- h3: Inputs
- h3: Push with the bias
- h3: Raise one input
- h3: Sigmoid against ReLU
- h3: Silence a connection
- h3: Try it: one input, one weight
- h3: Weights and bias
- h3: Your neuron
- legend: Activation function
- legend: Multiple choiceA neuron works in two stages. What does the first stage produce?
- legend: Multiple choiceWhich activation function can only give # or #?
- legend: Predict the output · uses your current settingsKeep these settings (z = #) and choose Step. What does the neuron output?
- legend: Predict the output · uses your current settingsWith the settings on screen, the weighted sum is z = #. What would the ne
- legend: ScenarioYou set weight w₁ to #. Then you change input x₁ from # to #. What happens to z?

## learn: experiment 02

**Panels** (4)

- Learning objectives
- Perceptron controls
- Score
- What you will understand

**Controls (data-control id, element, accessible name)** (26)

- b (range): Bias b
- b:exact (input): Bias b, exact value
- begin (a): Begin ↓
- check:p-bias:0 (radio): It grows
- check:p-bias:1 (radio): It shrinks: every z drops by the same amount, so fewer inputs reach the threshold
- check:p-bias:2 (radio): It turns around
- check:p-live:0 (radio): #
- check:p-live:1 (radio): #
- check:p-rule:0 (radio): When its weighted sum plus bias, z, is at least #
- check:p-rule:1 (radio): When both inputs are #
- check:p-rule:2 (radio): When its weights are positive
- check:p-xor:0 (radio): Its decision boundary is one straight line, and no straight line puts (#) and (#) on one side with (#) and (#) on the ot
- check:p-xor:1 (radio): The weights would need to be very large
- check:p-xor:2 (radio): XOR has too few examples
- gate:AND (radio): AND
- gate:NOT (radio): NOT
- gate:OR (radio): OR
- gate:XOR (radio): XOR
- next-experiment (a): Next: # · Linear vs Nonlinear Transformations →
- reset (button): Reset to starting values
- solution (button): Show me one setting that works
- tour:start (button): ▶ Start guided tour
- w1 (range): Weight w₁
- w1:exact (input): Weight w₁, exact value
- w2 (range): Weight w₂
- w2:exact (input): Weight w₂, exact value

**Disclosure sections** (1)

- See the engine’s record of these rows

**Information shown (headings, captions, legends)** (20)

- caption: Steps in the engine’s record
- caption: Truth table and the perceptron’s answers
- figcaption: AND: inputs in the shaded region give output #.
- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: Build NOT
- h3: Build OR
- h3: Fight XOR
- h3: Turn the line
- h3: Weights and bias
- h3: Your perceptron
- legend: Multiple choiceIn this experiment, when does the perceptron output #?
- legend: Multiple choiceWhy can no setting of one perceptron get all four XOR rows right?
- legend: Predict the output · uses your current settingsWith the weights and bias on screen (w₁ = #, w₂ = #, b = #), what does th
- legend: ScenarioYou make the bias much more negative and leave the weights alone. What happens to the region that outputs #?
- legend: Target gate

## learn: experiment 03

**Panels** (2)

- Learning objectives
- What you will understand

**Controls (data-control id, element, accessible name)** (58)

- begin (a): Begin ↓
- check:l-compose:0 (radio): exactly what one linear layer can do, and nothing more
- check:l-compose:1 (radio): twice as much as one layer
- check:l-compose:2 (radio): anything, if the layers are wide enough
- check:l-fix:0 (radio): Adding a nonlinear activation between the layers
- check:l-fix:1 (radio): Adding more linear layers
- check:l-fix:2 (radio): Using larger weights
- check:l-grid:0 (radio): They stay straight, and parallel lines stay parallel
- check:l-grid:1 (radio): They can bend into curves
- check:l-grid:2 (radio): They always stay exactly the same
- check:l-live:0 (radio): #
- check:l-live:1 (radio): #
- check:l-live:2 (radio): #
- combine (button): Find the single layer that does the same
- layer1:flip (radio): Mirror
- layer1:identity (radio): Leave as is
- layer1:rotate (radio): Turn
- layer1:shear (radio): Shear
- layer1:shift (radio): Shift
- layer1:stretch (radio): Stretch
- layer2:flip (radio): Mirror
- layer2:identity (radio): Leave as is
- layer2:rotate (radio): Turn
- layer2:shear (radio): Shear
- layer2:shift (radio): Shift
- layer2:stretch (radio): Stretch
- next-experiment (a): Next: # · Multilayer Perceptron: From Architecture to Training Trace →
- nonlinear:linear (radio): None (linear)
- nonlinear:relu (radio): ReLU (nonlinear)
- p1:b0 (range): Bias: shift x′
- p1:b0:exact (input): Bias: shift x′, exact value
- p1:b1 (range): Bias: shift y′
- p1:b1:exact (input): Bias: shift y′, exact value
- p1:w0 (range): Weight: x′ from x₁
- p1:w0:exact (input): Weight: x′ from x₁, exact value
- p1:w1 (range): Weight: y′ from x₁
- p1:w1:exact (input): Weight: y′ from x₁, exact value
- p1:w2 (range): Weight: x′ from x₂
- p1:w2:exact (input): Weight: x′ from x₂, exact value
- p1:w3 (range): Weight: y′ from x₂
- p1:w3:exact (input): Weight: y′ from x₂, exact value
- p3:b (range): Bias b
- p3:b:exact (input): Bias b, exact value
- p3:w0 (range): Weight w₁
- p3:w0:exact (input): Weight w₁, exact value
- p3:w1 (range): Weight w₂
- p3:w1:exact (input): Weight w₂, exact value
- p4:b0 (range): Hidden bias #
- p4:b0:exact (input): Hidden bias # exact value
- p4:b1 (range): Hidden bias #
- p4:b1:exact (input): Hidden bias # exact value
- preset:flip (radio): Mirror
- preset:identity (radio): Leave as is
- preset:rotate (radio): Turn
- preset:shear (radio): Shear
- preset:shift (radio): Shift
- preset:stretch (radio): Stretch
- tour:start (button): ▶ Start guided tour

**Disclosure sections** (3)

- Change the hidden biases
- Set the weights and bias yourself
- Why: the formula

**Information shown (headings, captions, legends)** (30)

- figcaption: After layer #
- figcaption: After the layer
- figcaption: Before: the original points
- figcaption: Linear only: one straight boundary.
- figcaption: Original
- figcaption: The output neuron draws one straight line in this hidden space.
- figcaption: XOR with a linear classifier
- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: Add a nonlinear step
- h3: Break the solution
- h3: Compose two layers
- h3: Look inside
- h3: Squash the plane
- h3: Two linear layers in a row
- h3: What one linear layer does
- h3: XOR, with one straight line
- h4: Inside: where the hidden layer puts the four points
- h4: The network’s decision
- legend: Choose a transformation
- legend: Hidden-layer activation
- legend: Layer #
- legend: Multiple choiceTwo linear layers, one after the other, with no activation between them, can do…
- legend: Multiple choiceWhich change lets a network separate XOR?
- legend: Predict the output · uses your current settingsWith the hidden activation set to none (linear) and the hidden biases on 
- legend: ScenarioYou apply any linear layer to a square grid. What happens to the grid lines?

## learn: experiment 04 (trained)

**Panels** (5)

- Learning objectives
- Trace explorer
- Training overview
- What you will understand
- Your training settings

**Controls (data-control id, element, accessible name)** (82)

- arch:activation:relu (radio): ReLU
- arch:activation:sigmoid (radio): Sigmoid
- arch:activation:tanh (radio): Tanh
- arch:layers:1 (radio): #
- arch:layers:2 (radio): #
- arch:layers:3 (radio): #
- arch:units:0:1 (radio): #
- arch:units:0:2 (radio): #
- arch:units:0:3 (radio): #
- arch:units:0:4 (radio): #
- arch:units:0:6 (radio): #
- arch:units:0:8 (radio): #
- begin (a): Begin ↓
- check:m-epoch:0 (radio): One complete pass through all the training examples
- check:m-epoch:1 (radio): One group of examples processed together
- check:m-epoch:2 (radio): One adjustment of the parameters
- check:m-live-batches:0 (radio): #
- check:m-live-batches:1 (radio): #
- check:m-live-batches:2 (radio): #
- check:m-live-run:0 (radio): lower
- check:m-live-run:1 (radio): about the same (within # %)
- check:m-live-run:2 (radio): higher
- check:m-loss:0 (radio): The one that predicts #
- check:m-loss:1 (radio): The one that predicts #
- check:m-loss:2 (radio): They are equal
- check:m-lr:0 (radio): How large each adjustment of the parameters is
- check:m-lr:1 (radio): How many examples are processed together
- check:m-lr:2 (radio): How many neurons each layer has
- loop:next (button): Next step →
- loss:prediction (range): Prediction
- loss:prediction:exact (input): Prediction, exact value
- loss:target:0 (radio): #
- loss:target:1 (radio): #
- lr:compare (button): Compare three learning rates
- next-experiment (a): Level # assessment →
- tour:start (button): ▶ Start guided tour
- trace:back (button): ◀ Previous stage
- trace:detail:layers (radio): Layers
- trace:detail:operations (radio): Operations
- trace:detail:stages (radio): Stages
- trace:end (button): Go to the end of the run
- trace:epoch (button): Epoch #: average loss #
- trace:history (button): Show how L#.W changed up to here
- trace:next (button): Next stage ▶
- trace:node:batch (button): Batch # of # · examples ## ##
- trace:node:batch (button): End of epoch: test every examplecheck
- trace:node:batch (button): Start of epoch: choose the order of the examplescontrol(done)
- trace:node:layer (button): Hidden layer # (L#)(done)
- trace:node:layer (button): Output layer (L#)(done)
- trace:node:layer (button): Whole network(done)
- trace:node:operation (button): finish this layer (backwards)##(done)
- trace:node:operation (button): pass the adjustment signal back through the activation##(done)
- trace:node:operation (button): work out how each bias should change##(done)
- trace:node:operation (button): work out how each weight should change##(done)
- trace:node:phase (button): Backward: work out how to adjustbackward(done)
- trace:node:phase (button): Forward: the network predictsforward(done)
- trace:node:phase (button): Loss: compare the prediction with the targetloss(done)
- trace:node:sample (button): Adjust the parameters (one update for the batch)update
- trace:node:sample (button): Batch beginscontrol(done)
- trace:node:sample (button): Example ##: inputs (# #), target #
- trace:node:sample (button): Example ##: inputs (# #), target #(done)
- trace:param (select): ParameterWeights of hidden layer # (l#)Biases of hidden layer # (l#)Weights of output layer (l#)Biases of output layer (
- trace:pin (button): 📌 Pin these values to compare
- trace:play (button): ▶▶ Watch
- trace:position (range): Position in the record# / #
- trace:size:batch (radio): Batch
- trace:size:epoch (radio): Epoch
- trace:size:layer (radio): Layer
- trace:size:operation (radio): Operation
- trace:size:phase (radio): Stage
- trace:size:sample (radio): Example
- trace:start (button): Go to the start of the run
- train (button): Train again with these settings
- train:batch:1 (radio): #
- train:batch:2 (radio): #
- train:batch:4 (radio): #
- train:epochs:150 (radio): #
- train:epochs:300 (radio): #
- train:epochs:50 (radio): #
- train:lr:0.1 (radio): #
- train:lr:1 (radio): #
- train:lr:10 (radio): #

**Disclosure sections** (3)

- Inspect and compare parameters
- The recorded instruction ##: BACKWARD_LAYER_END
- Values inside the network for this example

**Information shown (headings, captions, legends)** (43)

- caption: L#.W now
- caption: Parameters per layer
- caption: Runs so far: compare their outcomes
- figcaption: Loss after each epoch (checked on all four examples). Solid: up to the current point in the record. Dashed grey: the res
- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: Build a network
- h3: Down to the operations
- h3: How a network learns
- h3: One example at a time
- h3: The record of run #
- h3: The words you need for training
- h3: Too large a step
- h3: Too small a network
- h3: Train it, then inspect what happened
- h3: Watch a weight change
- h4: Epochs
- h4: Epochs and batches
- h4: How far off is a prediction?
- h4: Inside epoch # of #
- h4: Progress at this point in the record
- h4: Small, moderate and large steps
- h4: The learning loop
- h4: The network’s decision
- h4: Your training settings
- legend: Activation in the hidden layers
- legend: Batch size
- legend: Detail
- legend: Epochs
- legend: Hidden layers
- legend: Learning rate
- legend: Multiple choiceWhat does the learning rate control?
- legend: Multiple choiceWhat is an epoch?
- legend: Neurons in hidden layer #
- legend: Predict the output · uses your current settingsWith your batch size of # and the # XOR examples, how many batches, and s
- legend: Scenario · uses your current settingsLook at the loss chart of run #. Compared with after epoch # the loss at the end of
- legend: ScenarioA network predicts # for an example whose target is #. Another predicts # for the same example. Which has the la
- legend: Step size
- legend: Target

## learn: experiment 04

**Panels** (3)

- Learning objectives
- What you will understand
- Your training settings

**Controls (data-control id, element, accessible name)** (46)

- arch:activation:relu (radio): ReLU
- arch:activation:sigmoid (radio): Sigmoid
- arch:activation:tanh (radio): Tanh
- arch:layers:1 (radio): #
- arch:layers:2 (radio): #
- arch:layers:3 (radio): #
- arch:units:0:1 (radio): #
- arch:units:0:2 (radio): #
- arch:units:0:3 (radio): #
- arch:units:0:4 (radio): #
- arch:units:0:6 (radio): #
- arch:units:0:8 (radio): #
- begin (a): Begin ↓
- check:m-epoch:0 (radio): One complete pass through all the training examples
- check:m-epoch:1 (radio): One group of examples processed together
- check:m-epoch:2 (radio): One adjustment of the parameters
- check:m-live-batches:0 (radio): #
- check:m-live-batches:1 (radio): #
- check:m-live-batches:2 (radio): #
- check:m-live-run:0 (radio): lower
- check:m-live-run:1 (radio): about the same
- check:m-live-run:2 (radio): higher
- check:m-loss:0 (radio): The one that predicts #
- check:m-loss:1 (radio): The one that predicts #
- check:m-loss:2 (radio): They are equal
- check:m-lr:0 (radio): How large each adjustment of the parameters is
- check:m-lr:1 (radio): How many examples are processed together
- check:m-lr:2 (radio): How many neurons each layer has
- loop:next (button): Next step →
- loss:prediction (range): Prediction
- loss:prediction:exact (input): Prediction, exact value
- loss:target:0 (radio): #
- loss:target:1 (radio): #
- lr:compare (button): Compare three learning rates
- next-experiment (a): Level # assessment →
- tour:start (button): ▶ Start guided tour
- train (button): Train the network
- train:batch:1 (radio): #
- train:batch:2 (radio): #
- train:batch:4 (radio): #
- train:epochs:150 (radio): #
- train:epochs:300 (radio): #
- train:epochs:50 (radio): #
- train:lr:0.1 (radio): #
- train:lr:1 (radio): #
- train:lr:10 (radio): #

**Information shown (headings, captions, legends)** (33)

- caption: Parameters per layer
- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: Build a network
- h3: Down to the operations
- h3: How a network learns
- h3: One example at a time
- h3: The words you need for training
- h3: Too large a step
- h3: Too small a network
- h3: Train it, then inspect what happened
- h3: Watch a weight change
- h4: Epochs and batches
- h4: How far off is a prediction?
- h4: Small, moderate and large steps
- h4: The learning loop
- h4: Your training settings
- legend: Activation in the hidden layers
- legend: Batch size
- legend: Epochs
- legend: Hidden layers
- legend: Learning rate
- legend: Multiple choiceWhat does the learning rate control?
- legend: Multiple choiceWhat is an epoch?
- legend: Neurons in hidden layer #
- legend: Predict the output · uses your current settingsWith your batch size of # and the # XOR examples, how many batches, and s
- legend: Scenario · uses your current settingsCompared with after epoch # is the loss at the end of your run lower, the same or h
- legend: ScenarioA network predicts # for an example whose target is #. Another predicts # for the same example. Which has the la
- legend: Target

## learn: home

**Controls (data-control id, element, accessible name)** (1)

- start-learning (a): Start learning: Level # →

**Information shown (headings, captions, legends)** (4)

- h2: How it works
- h3: Experiment
- h3: Look back at every step
- h3: Real computation

## learn: L2 experiment 01

**Panels** (6)

- Contributions to the prediction
- Layer controls
- Learning objectives
- Neuron controls
- This step
- What you will understand

**Controls (data-control id, element, accessible name)** (63)

- a:act:linear (radio): Linear
- a:act:relu (radio): ReLU
- a:act:sigmoid (radio): Sigmoid
- a:act:tanh (radio): Tanh
- a:b (range): Bias b
- a:b:exact (input): Bias b, exact value
- a:w1 (range): Weight w₁
- a:w1:exact (input): Weight w₁, exact value
- a:w2 (range): Weight w₂
- a:w2:exact (input): Weight w₂, exact value
- a:w3 (range): Weight w₃
- a:w3:exact (input): Weight w₃, exact value
- a:x1 (range): Input x₁
- a:x1:exact (input): Input x₁, exact value
- a:x2 (range): Input x₂
- a:x2:exact (input): Input x₂, exact value
- a:x3 (range): Input x₃
- a:x3:exact (input): Input x₃, exact value
- b:b1 (range): Bias
- b:b1:exact (input): Bias, exact value
- b:b2 (range): Bias
- b:b2:exact (input): Bias, exact value
- b:w11 (range): Weight from x₁
- b:w11:exact (input): Weight from x₁, exact value
- b:w12 (range): Weight from x₁
- b:w12:exact (input): Weight from x₁, exact value
- b:w21 (range): Weight from x₂
- b:w21:exact (input): Weight from x₂, exact value
- b:w22 (range): Weight from x₂
- b:w22:exact (input): Weight from x₂, exact value
- begin (a): Begin ↓
- c:act:relu (radio): ReLU
- c:act:sigmoid (radio): Sigmoid
- c:act:tanh (radio): Tanh
- c:back (button): ◀ Previous step
- c:detail:layer (radio): Layer
- c:detail:operation (radio): Operation
- c:end (button): Prediction ⏭
- c:next (button): Next step ▶
- c:start (button): ⏮ Start
- c:v1 (range): Output weight from hidden #
- c:v1:exact (input): Output weight from hidden # exact value
- c:v2 (range): Output weight from hidden #
- c:v2:exact (input): Output weight from hidden # exact value
- c:vb (range): Output bias
- c:vb:exact (input): Output bias, exact value
- c:x1 (range): Input x₁
- c:x1:exact (input): Input x₁, exact value
- c:x2 (range): Input x₂
- c:x2:exact (input): Input x₂, exact value
- check:f-input:0 (radio): The activations of the layer before it
- check:f-input:1 (radio): The final prediction
- check:f-input:2 (radio): The target
- check:f-live:0 (radio): Hidden neuron #
- check:f-live:1 (radio): Hidden neuron #
- check:f-matrix:0 (radio): # rows × # columns: one row per neuron, one column per input
- check:f-matrix:1 (radio): # rows × # columns
- check:f-matrix:2 (radio): # rows × # columns
- check:f-twins:0 (radio): Only when their weights, biases and activation functions are the same
- check:f-twins:1 (radio): Always, because they receive the same inputs
- check:f-twins:2 (radio): Never, because neurons in a layer must differ
- next-experiment (a): Next: # · Loss Functions: Measuring Prediction Error →
- tour:start (button): ▶ Start guided tour

**Disclosure sections** (3)

- Change the network’s inputs and weights
- See the engine’s record of this forward pass
- Show the matrix form

**Information shown (headings, captions, legends)** (28)

- caption: Steps in the engine’s record
- figcaption: The ### network at this step. “·” marks a value not computed yet at this step.
- figcaption: Two neurons, the same two inputs. “·” marks a value not computed yet at this step.
- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: A single neuron with several inputs
- h3: A small network, step by step
- h3: Check one row
- h3: From neuron to layer
- h3: Identical neurons
- h3: Switch an input off
- h3: The same computation as matrices
- h3: Who decides the prediction?
- h4: Layer # (hidden)
- h4: Layer # (output)
- h4: Neuron #
- h4: What feeds the output neuron
- legend: Activation function
- legend: Hidden activation
- legend: Multiple choiceA layer has # neurons and # inputs. In z = W a + b, what shape is W?
- legend: Multiple choiceIn forward propagation, what does a hidden layer receive as its input?
- legend: Predict the output · uses your current settingsWith the network’s current settings, which hidden neuron contributes more
- legend: ScenarioTwo neurons in the same layer receive the same inputs. When do they compute the same activation?
- legend: Step by

## learn: L2 experiment 02

**Panels** (2)

- Learning objectives
- What you will understand

**Controls (data-control id, element, accessible name)** (39)

- a:prediction (range): Prediction ŷ
- a:prediction:exact (input): Prediction ŷ, exact value
- a:target (range): Target y
- a:target:exact (input): Target y, exact value
- b:p1 (range): ŷ of example #
- b:p1:exact (input): ŷ of example # exact value
- b:p2 (range): ŷ of example #
- b:p2:exact (input): ŷ of example # exact value
- b:p3 (range): ŷ of example #
- b:p3:exact (input): ŷ of example # exact value
- b:p4 (range): ŷ of example #
- b:p4:exact (input): ŷ of example # exact value
- begin (a): Begin ↓
- c:p (range): Probability p of class #
- c:p:exact (input): Probability p of class # exact value
- c:y:0 (radio): #
- c:y:1 (radio): #
- check:l-bce:0 (radio): B, because it gives the right answer a higher probability
- check:l-bce:1 (radio): A, because # is less extreme
- check:l-bce:2 (radio): They are equal
- check:l-live-mse:0 (radio): #
- check:l-live-mse:1 (radio): #
- check:l-live-mse:2 (radio): #
- check:l-logit:0 (radio): The network’s raw output before the sigmoid: any real number
- check:l-logit:1 (radio): A probability between # and #
- check:l-logit:2 (radio): The loss of one example
- check:l-square:0 (radio): So that positive and negative errors cannot cancel out, and large errors count more
- check:l-square:1 (radio): To make the loss smaller
- check:l-square:2 (radio): Because predictions are probabilities
- d:p (range): Probability p
- d:p:exact (input): Probability p, exact value
- d:y:0 (radio): #
- d:y:1 (radio): #
- e:y:0 (radio): #
- e:y:1 (radio): #
- e:z (range): Logit z
- e:z:exact (input): Logit z, exact value
- next-experiment (a): Next: # · Derivatives and Gradient Descent: How Parameters Learn →
- tour:start (button): ▶ Start guided tour

**Disclosure sections** (1)

- Show the formula

**Information shown (headings, captions, legends)** (23)

- caption: Each row is one example
- figcaption: Binary cross-entropy for target # against the predicted probability The vertical axis stops at # for readability only: c
- figcaption: Both losses for target # The vertical axis stops at # for readability only: cross-entropy itself has no upper limit.
- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: A perfect score
- h3: Binary cross-entropy
- h3: Comparing the two
- h3: Confident and wrong
- h3: From logit to probability to loss
- h3: Mean squared error
- h3: One bad prediction
- h3: Prediction against target
- h3: The edge of the scale
- legend: Multiple choiceWhat is a logit?
- legend: Multiple choiceWhy does MSE square each error before averaging?
- legend: Predict the output · uses your current settingsFor the four predictions in Part B (as they are set now), what is the mea
- legend: ScenarioThe target is #. Network A predicts # and network B predicts #. Which has the lower binary cross-entropy?
- legend: Target y

## learn: L2 experiment 03 (trained)

**Panels** (6)

- Learning objectives
- Learning rate
- One gradient descent step
- Point controls
- Trace explorer
- What you will understand

**Controls (data-control id, element, accessible name)** (52)

- a:x (range): Point x
- a:x:exact (input): Point x, exact value
- begin (a): Begin ↓
- c:lr:0.1 (radio): #
- c:lr:1 (radio): #
- c:lr:10 (radio): #
- c:reset (button): Back to the start
- c:step (button): Take one step
- check:full-batch:0 (radio): Once: the four examples’ gradients are averaged into one update
- check:full-batch:1 (radio): Four times, once per example
- check:full-batch:2 (radio): It depends on the learning rate
- check:g-live-run:0 (radio): Up
- check:g-live-run:1 (radio): Down
- check:g-live-slope:0 (radio): Move x to the right (increase x)
- check:g-live-slope:1 (radio): Move x to the left (decrease x)
- check:g-live-slope:2 (radio): Neither: the curve is flat here
- check:g-vs-u:0 (radio): The update is −η times the gradient: the gradient gives the direction uphill, and the update steps the other way, scaled
- check:g-vs-u:1 (radio): They are the same number
- check:g-vs-u:2 (radio): The update is the gradient plus the learning rate
- check:too-large:0 (radio): Each step moves so far that it passes the minimum and lands on the other side, often higher
- check:too-large:1 (radio): The gradient points the wrong way
- check:too-large:2 (radio): A large learning rate always converges faster
- d:lr:0 (radio): Small (#)
- d:lr:1 (radio): Suitable (#)
- d:lr:2 (radio): Large (#)
- d:lr:3 (radio): Too large (#)
- e:batch1 (button): Run one epoch with batch size #
- e:lr:0.1 (radio): #
- e:lr:1 (radio): #
- e:lr:10 (radio): #
- e:reveal (button): Show the next stage
- e:reveal-all (button): Show all
- e:train (button): Train again with these settings
- next-experiment (a): Next: # · Backpropagation: How Errors Travel Through a Network →
- tour:start (button): ▶ Start guided tour
- trace:back (button): ◀ Previous stage
- trace:detail:layers (radio): Layers
- trace:detail:operations (radio): Operations
- trace:detail:stages (radio): Stages
- trace:end (button): Go to the end of the run
- trace:epoch (button): Epoch #: average loss #
- trace:next (button): Next stage ▶
- trace:node:batch (button): Batch # of # · examples ## ## ## ##
- trace:node:batch (button): End of epoch: test every examplecheck
- trace:node:batch (button): Start of epoch: choose the order of the examplescontrol
- trace:play (button): ▶▶ Watch
- trace:position (range): Position in the record# / #
- trace:size:batch (radio): Batch
- trace:size:epoch (radio): Epoch
- trace:size:phase (radio): Stage
- trace:size:sample (radio): Example
- trace:start (button): Go to the start of the run

**Disclosure sections** (2)

- Show the formula
- The update rule

**Information shown (headings, captions, legends)** (39)

- caption: One row per example (hover a value for the recorded step it came from)
- caption: Step a little to the right (a run of h), see how much f rises, and divide. The smaller the step, the closer this comes t
- figcaption: f(x) = (x − #)² + # with the tangent at the point (dashed)
- figcaption: Run #: the loss on all four examples after each epoch, from the record
- figcaption: Steps with η = # (numbered; steps off the chart are listed in the table)
- figcaption: The neuron’s loss L(w, b) over the four examples
- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: Derivatives, partial derivatives and the gradient
- h3: Find the flat spot
- h3: Gradient descent: step against the gradient
- h3: One update or four?
- h3: Real training: one neuron, four examples
- h3: Slope: which way is downhill?
- h3: Small, suitable and too-large learning rates
- h3: The record of run #
- h3: Too big a step
- h3: Train with learning rate #
- h3: Walk downhill
- h4: Before the run
- h4: Compare: update after every example (batch size #)
- h4: Epochs
- h4: Inside epoch # of #
- h4: The first update, read from the record
- h4: The next step, in order
- h4: Zooming in on the slope at x = #
- legend: Detail
- legend: Learning rate
- legend: Learning rate η
- legend: Multiple choiceWhat is the difference between the gradient ∂L/∂w and the update applied to w?
- legend: Predict the output · uses your current settingsIn Part A the point is at x = #, where the engine’s derivative is f′(x) =
- legend: Predict the output · uses your current settingsIn run # the first update averaged the gradient to ∂L/∂w = # with η = #. 
- legend: ScenarioA neuron is trained with full-batch gradient descent on # examples. How many times are its parameters updated in
- legend: ScenarioWith a very large learning rate, the loss jumps up and down and never settles. Why?
- legend: Step size

## learn: L2 experiment 03

**Panels** (5)

- Learning objectives
- Learning rate
- One gradient descent step
- Point controls
- What you will understand

**Controls (data-control id, element, accessible name)** (32)

- a:x (range): Point x
- a:x:exact (input): Point x, exact value
- begin (a): Begin ↓
- c:lr:0.1 (radio): #
- c:lr:1 (radio): #
- c:lr:10 (radio): #
- c:reset (button): Back to the start
- c:step (button): Take one step
- check:full-batch:0 (radio): Once: the four examples’ gradients are averaged into one update
- check:full-batch:1 (radio): Four times, once per example
- check:full-batch:2 (radio): It depends on the learning rate
- check:g-live-run:0 (radio): Up
- check:g-live-run:1 (radio): Down
- check:g-live-slope:0 (radio): Move x to the right (increase x)
- check:g-live-slope:1 (radio): Move x to the left (decrease x)
- check:g-live-slope:2 (radio): Neither: the curve is flat here
- check:g-vs-u:0 (radio): The update is −η times the gradient: the gradient gives the direction uphill, and the update steps the other way, scaled
- check:g-vs-u:1 (radio): They are the same number
- check:g-vs-u:2 (radio): The update is the gradient plus the learning rate
- check:too-large:0 (radio): Each step moves so far that it passes the minimum and lands on the other side, often higher
- check:too-large:1 (radio): The gradient points the wrong way
- check:too-large:2 (radio): A large learning rate always converges faster
- d:lr:0 (radio): Small (#)
- d:lr:1 (radio): Suitable (#)
- d:lr:2 (radio): Large (#)
- d:lr:3 (radio): Too large (#)
- e:lr:0.1 (radio): #
- e:lr:1 (radio): #
- e:lr:10 (radio): #
- e:train (button): Train the neuron
- next-experiment (a): Next: # · Backpropagation: How Errors Travel Through a Network →
- tour:start (button): ▶ Start guided tour

**Disclosure sections** (2)

- Show the formula
- The update rule

**Information shown (headings, captions, legends)** (29)

- caption: Step a little to the right (a run of h), see how much f rises, and divide. The smaller the step, the closer this comes t
- figcaption: f(x) = (x − #)² + # with the tangent at the point (dashed)
- figcaption: Steps with η = # (numbered; steps off the chart are listed in the table)
- figcaption: The neuron’s loss L(w, b) over the four examples
- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: Derivatives, partial derivatives and the gradient
- h3: Find the flat spot
- h3: Gradient descent: step against the gradient
- h3: One update or four?
- h3: Real training: one neuron, four examples
- h3: Slope: which way is downhill?
- h3: Small, suitable and too-large learning rates
- h3: Too big a step
- h3: Train with learning rate #
- h3: Walk downhill
- h4: The next step, in order
- h4: Zooming in on the slope at x = #
- legend: Learning rate
- legend: Learning rate η
- legend: Multiple choiceWhat is the difference between the gradient ∂L/∂w and the update applied to w?
- legend: Predict the output · uses your current settingsIn Part A the point is at x = #, where the engine’s derivative is f′(x) =
- legend: Predict the output · uses your current settingsIn your training run’s first update, did the weight w go up or down?
- legend: ScenarioA neuron is trained with full-batch gradient descent on # examples. How many times are its parameters updated in
- legend: ScenarioWith a very large learning rate, the loss jumps up and down and never settles. Why?

## learn: L2 experiment 04 (trained)

**Panels** (6)

- Chain controls
- Learning objectives
- Neuron controls
- Trace explorer
- What you will understand
- Where a parameter’s gradient comes from

**Controls (data-control id, element, accessible name)** (63)

- a:x (range): x
- a:x:exact (input): x, exact value
- b:b (range): Bias b
- b:b:exact (input): Bias b, exact value
- b:w (range): Weight w
- b:w:exact (input): Weight w, exact value
- b:x (range): Input x
- b:x:exact (input): Input x, exact value
- b:y:0 (radio): #
- b:y:1 (radio): #
- begin (a): Begin ↓
- c:apply (button): Apply this example’s update
- c:back (button): ◀ Step back
- c:next-example (button): Next example ▶▶
- c:param (select): Parameterweight x₁ → hidden #weight x₂ → hidden #weight x₁ → hidden #weight x₂ → hidden #bias of hidden neuron #bias of 
- c:prev-example (button): ◀◀ Previous example
- c:replay (button): ⏮ Replay this example
- c:step (button): Step ▶
- c:to-backward-end (button): To the end of the backward pass
- c:train (button): Run again
- check:b-chain:0 (radio): f′(g(x)) × g′(x): the rate of f at g, times the rate of g
- check:b-chain:1 (radio): f′(x) + g′(x)
- check:b-chain:2 (radio): f′(x) × g′(x)
- check:b-live-chain:0 (radio): #
- check:b-live-chain:1 (radio): #
- check:b-live-chain:2 (radio): #
- check:b-live-weight:0 (radio): #
- check:b-live-weight:1 (radio): #
- check:b-order:0 (radio): The output layer’s, because the hidden layer’s gradients need the gradient arriving from the output layer
- check:b-order:1 (radio): The hidden layer’s, because it comes first in the network
- check:b-order:2 (radio): All at the same time
- check:b-weight:0 (radio): aᵢ × ∂L/∂zⱼ: the weight’s input times the gradient arriving at neuron j
- check:b-weight:1 (radio): w × ∂L/∂zⱼ
- check:b-weight:2 (radio): The same for every weight of the layer
- next-experiment (a): Next: # · Automatic Differentiation: Inside the Computational Graph →
- tour:start (button): ▶ Start guided tour
- trace:back (button): ◀ Previous stage
- trace:detail:layers (radio): Layers
- trace:detail:operations (radio): Operations
- trace:detail:stages (radio): Stages
- trace:end (button): Go to the end of the run
- trace:epoch (button): Epoch #: average loss #
- trace:history (button): Show how L#.W changed up to here
- trace:next (button): Next stage ▶
- trace:node:batch (button): End of epoch: test every examplecheck
- trace:node:batch (button): Example # of # (dataset ##), updated on its own
- trace:node:batch (button): Example # of # (dataset ##), updated on its own(done)
- trace:node:batch (button): Start of epoch: choose the order of the examplescontrol(done)
- trace:node:phase (button): Bookkeepingcontrol(done)
- trace:node:phase (button): Loss: compare the prediction with the targetloss(done)
- trace:node:phase (button): Update: w ← w − η·gupdate(done)
- trace:node:sample (button): Batch beginscontrol(done)
- trace:node:sample (button): Example ##: inputs (# #), target #(done)
- trace:node:sample (button): Update the parameters (one update for this example)update(done)
- trace:param (select): ParameterWeights of hidden layer # (l#)Biases of hidden layer # (l#)Weights of output layer (l#)Biases of output layer (
- trace:pin (button): 📌 Pin these values to compare
- trace:play (button): ▶▶ Watch
- trace:position (range): Position in the record# / #
- trace:size:batch (radio): Batch
- trace:size:epoch (radio): Epoch
- trace:size:phase (radio): Stage
- trace:size:sample (radio): Example
- trace:start (button): Go to the start of the run

**Disclosure sections** (3)

- Inspect and compare parameters
- Show the formula
- Where the hidden neuron’s incoming gradient came from

**Information shown (headings, captions, legends)** (28)

- caption: L#.W now
- caption: Parameters updated after this example
- caption: This example’s update: one per example
- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: A broken link
- h3: A silent input
- h3: Backpropagation through a ### network
- h3: Backpropagation through one neuron
- h3: Nothing to learn
- h3: Replay before updating
- h3: The chain rule
- h3: The record of run #
- h4: Epochs
- h4: Inside epoch # of #
- h4: Where a parameter’s gradient comes from
- legend: Detail
- legend: Multiple choiceA weight connects input aᵢ to neuron j. What is its gradient ∂L/∂w?
- legend: Multiple choiceFor y = f(g(x)), what does the chain rule say dy/dx is?
- legend: Predict the output · uses your current settingsIn Part A, at x = #: dg/dx = # and dy/dg = #. What is dy/dx?
- legend: Predict the output · uses your current settingsIn Part C, for the weight x₁ → hidden #: the incoming gradient is ∂L/∂z =
- legend: ScenarioIn the backward pass of a ### network, which gradients are computed first?
- legend: Step size
- legend: Target

## learn: L2 experiment 04

**Panels** (4)

- Chain controls
- Learning objectives
- Neuron controls
- What you will understand

**Controls (data-control id, element, accessible name)** (27)

- a:x (range): x
- a:x:exact (input): x, exact value
- b:b (range): Bias b
- b:b:exact (input): Bias b, exact value
- b:w (range): Weight w
- b:w:exact (input): Weight w, exact value
- b:x (range): Input x
- b:x:exact (input): Input x, exact value
- b:y:0 (radio): #
- b:y:1 (radio): #
- begin (a): Begin ↓
- c:train (button): Run the network
- check:b-chain:0 (radio): f′(g(x)) × g′(x): the rate of f at g, times the rate of g
- check:b-chain:1 (radio): f′(x) + g′(x)
- check:b-chain:2 (radio): f′(x) × g′(x)
- check:b-live-chain:0 (radio): #
- check:b-live-chain:1 (radio): #
- check:b-live-chain:2 (radio): #
- check:b-live-weight:0 (radio): —
- check:b-order:0 (radio): The output layer’s, because the hidden layer’s gradients need the gradient arriving from the output layer
- check:b-order:1 (radio): The hidden layer’s, because it comes first in the network
- check:b-order:2 (radio): All at the same time
- check:b-weight:0 (radio): aᵢ × ∂L/∂zⱼ: the weight’s input times the gradient arriving at neuron j
- check:b-weight:1 (radio): w × ∂L/∂zⱼ
- check:b-weight:2 (radio): The same for every weight of the layer
- next-experiment (a): Next: # · Automatic Differentiation: Inside the Computational Graph →
- tour:start (button): ▶ Start guided tour

**Disclosure sections** (1)

- Show the formula

**Information shown (headings, captions, legends)** (19)

- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: A broken link
- h3: A silent input
- h3: Backpropagation through a ### network
- h3: Backpropagation through one neuron
- h3: Nothing to learn
- h3: Replay before updating
- h3: The chain rule
- legend: Multiple choiceA weight connects input aᵢ to neuron j. What is its gradient ∂L/∂w?
- legend: Multiple choiceFor y = f(g(x)), what does the chain rule say dy/dx is?
- legend: Predict the output · uses your current settingsIn Part A, at x = #: dg/dx = # and dy/dg = #. What is dy/dx?
- legend: Predict the output · uses your current settingsPick a parameter in Part C and step through an example’s backward pass. W
- legend: ScenarioIn the backward pass of a ### network, which gradients are computed first?
- legend: Target

## learn: L2 experiment 05 (trained)

**Panels** (15)

- #. Backpropagation
- #. Gradients
- #. Loss
- #. Prediction (forward pass)
- #. Update
- Before and after training
- Finite-difference step
- Graph inputs
- Learning objectives
- Network for the count
- One update, taken apart
- Shared-value inputs
- The chosen step
- Trace explorer
- What you will understand

**Controls (data-control id, element, accessible name)** (100)

- a:expr:product (radio): (x₁ + x₂) · x₃
- a:expr:sigmoid (radio): σ((x₁ + x₂) · x₃)
- a:x1 (range): x₁
- a:x1:exact (input): x₁, exact value
- a:x2 (range): x₂
- a:x2:exact (input): x₂, exact value
- a:x3 (range): x₃
- a:x3:exact (input): x₃, exact value
- b:back (button): ◀ Step back
- b:end (button): To the end of the reverse pass
- b:start (button): ⏮ Start
- b:step (button): Step ▶
- begin (a): Begin ↓
- c:h:0.001 (radio): #
- c:h:0.01 (radio): #
- c:h:0.1 (radio): #
- c:h:1 (radio): #
- check:ad-fd:0 (radio): They are approximate, depend on the step h, and need two extra evaluations for every single parameter
- check:ad-fd:1 (radio): They give the wrong sign
- check:ad-fd:2 (radio): They only work for linear functions
- check:ad-live-grad:0 (radio): #
- check:ad-live-grad:1 (radio): #
- check:ad-live-shared:0 (radio): #
- check:ad-live-shared:1 (radio): #
- check:ad-live-shared:2 (radio): #
- check:ad-live-update:0 (radio): #
- check:ad-live-update:1 (radio): #
- check:ad-live-update:2 (radio): #
- check:ad-reverse:0 (radio): One backward pass gives the gradient of the loss with respect to all # weights
- check:ad-reverse:1 (radio): Because the forward pass cannot be repeated
- check:ad-reverse:2 (radio): Because working backwards gives more exact gradients
- check:ad-shared:0 (radio): The sum of the two contributions that arrive at v
- check:ad-shared:1 (radio): The larger of the two contributions
- check:ad-shared:2 (radio): Only the first contribution to arrive
- check:ad-update:0 (radio): It averages them into ḡ, then w ← w − η·ḡ
- check:ad-update:1 (radio): It applies the # gradients one after another
- check:ad-update:2 (radio): It uses the largest of the # gradients
- d:x (range): x
- d:x:exact (input): x, exact value
- d:y (range): y
- d:y:exact (input): y, exact value
- e:net:2-16-16-1 (radio): ####
- e:net:2-2-1 (radio): ### (Experiment #)
- e:net:2-3-1 (radio): ###
- f:example:0 (radio): Example #
- f:example:1 (radio): Example #
- f:example:2 (radio): Example #
- f:example:3 (radio): Example #
- g:activation:relu (radio): relu
- g:activation:sigmoid (radio): sigmoid
- g:activation:tanh (radio): tanh
- g:batch (select): Update (batch)# of # of # of # of # of #
- g:batchSize:1 (radio): # (one example)
- g:batchSize:40 (radio): # (all)
- g:batchSize:8 (radio): #
- g:compare (select): Compare epoch # with epoch#
- g:epoch (select): Epoch#
- g:example (select): Example in this batch# of # (dataset ##)# of # (dataset ##)# of # (dataset ##)# of # (dataset ##)# of # (dataset ##)# of
- g:lr:0.05 (radio): #
- g:lr:0.5 (radio): #
- g:lr:2 (radio): #
- g:show:backward (button): Show step ## in the record
- g:show:gradients (button): Show step ## in the record
- g:show:loss (button): Show step ## in the record
- g:show:prediction (button): Show step ## in the record
- g:show:update (button): Show step ## in the record
- g:train (button): Train again with these settings
- g:units:2 (radio): #
- g:units:3 (radio): #
- g:units:4 (radio): #
- next-experiment (a): Level # overview →
- tour:start (button): ▶ Start guided tour
- trace:back (button): ◀ Previous stage
- trace:detail:layers (radio): Layers
- trace:detail:operations (radio): Operations
- trace:detail:stages (radio): Stages
- trace:end (button): Go to the end of the run
- trace:epoch (button): Epoch #: average loss #
- trace:history (button): Show how L#.W changed up to here
- trace:next (button): Next stage ▶
- trace:node:batch (button): Batch # of # · examples ## ## ## ## ## ## ## ##
- trace:node:batch (button): Batch # of # · examples ## ## ## ## ## ## ## ##(done)
- trace:node:batch (button): End of epoch: test every examplecheck
- trace:node:batch (button): Start of epoch: choose the order of the examplescontrol(done)
- trace:node:phase (button): Bookkeepingcontrol(done)
- trace:node:phase (button): Loss: compare the prediction with the targetloss(done)
- trace:node:phase (button): Update: w ← w − η·gupdate(done)
- trace:node:sample (button): Batch beginscontrol(done)
- trace:node:sample (button): Example ##: inputs (# #), target #(done)
- trace:node:sample (button): Example ##: inputs (#, #), target #(done)
- trace:node:sample (button): Update the parameters (one update for the whole batch)update(done)
- trace:param (select): ParameterWeights of hidden layer # (l#)Biases of hidden layer # (l#)Weights of output layer (l#)Biases of output layer (
- trace:pin (button): 📌 Pin these values to compare
- trace:play (button): ▶▶ Watch
- trace:position (range): Position in the record# / #
- trace:size:batch (radio): Batch
- trace:size:epoch (radio): Epoch
- trace:size:phase (radio): Stage
- trace:size:sample (radio): Example
- trace:start (button): Go to the start of the run

**Disclosure sections** (1)

- Inspect and compare parameters

**Information shown (headings, captions, legends)** (50)

- caption: Every gradient of f = (x₁ + x₂) · x₃
- caption: Every gradient of one example’s loss, ### (Experiment #)
- caption: L#.W now
- caption: Parameters updated in this batch
- caption: What arrives at x in the reverse pass
- figcaption: After epoch #: shaded where the network answers # (output ≥ #).
- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: A calculation as a graph
- h3: A closed path
- h3: A rough estimate
- h3: A value used twice
- h3: Checking the gradients from outside
- h3: Final challenge: a batch’s average
- h3: Final challenge: before and after
- h3: Final challenge: follow one update
- h3: Forward mode and reverse mode
- h3: Forwards, then in reverse
- h3: The engine’s own graph
- h3: The record of run #
- h3: Train a network and take one update apart
- h3: Two contributions that cancel
- h3: Where a weight came from
- h4: Epochs
- h4: Inside epoch # of #
- h4: Loss after each epoch
- h4: One update, taken apart
- h4: Step ##: W¹
- h4: The decision, after epoch # and after a later epoch
- legend: Batch size
- legend: Detail
- legend: Example
- legend: Expression
- legend: Hidden activation
- legend: Hidden neurons
- legend: Learning rate η
- legend: Multiple choiceA value v is used by two operations. What is ∂f/∂v?
- legend: Multiple choiceWhy does the engine not compute gradients with finite differences?
- legend: Multiple choiceWith batch size # how does the engine turn the # examples’ gradients into one change of a weight w?
- legend: Network
- legend: Predict the output · uses your current settingsIn Part D, f = x · y + x with x = # and y = #. What is ∂f/∂x?
- legend: Predict the output · uses your current settingsIn Parts A to C, f = (x₁ + x₂) · x₃ at x₁ = #, x₂ = #, x₃ = #. What is ∂f
- legend: Predict the output · uses your current settingsIn the final challenge’s update (epoch # batch #), the output bias was #,
- legend: ScenarioA network has # weights and one loss. Why does the engine compute gradients backwards, from the loss?
- legend: Step h
- legend: Step size

## learn: L2 experiment 05

**Panels** (7)

- Finite-difference step
- Graph inputs
- Learning objectives
- Network for the count
- Shared-value inputs
- The chosen step
- What you will understand

**Controls (data-control id, element, accessible name)** (61)

- a:expr:product (radio): (x₁ + x₂) · x₃
- a:expr:sigmoid (radio): σ((x₁ + x₂) · x₃)
- a:x1 (range): x₁
- a:x1:exact (input): x₁, exact value
- a:x2 (range): x₂
- a:x2:exact (input): x₂, exact value
- a:x3 (range): x₃
- a:x3:exact (input): x₃, exact value
- b:back (button): ◀ Step back
- b:end (button): To the end of the reverse pass
- b:start (button): ⏮ Start
- b:step (button): Step ▶
- begin (a): Begin ↓
- c:h:0.001 (radio): #
- c:h:0.01 (radio): #
- c:h:0.1 (radio): #
- c:h:1 (radio): #
- check:ad-fd:0 (radio): They are approximate, depend on the step h, and need two extra evaluations for every single parameter
- check:ad-fd:1 (radio): They give the wrong sign
- check:ad-fd:2 (radio): They only work for linear functions
- check:ad-live-grad:0 (radio): #
- check:ad-live-grad:1 (radio): #
- check:ad-live-shared:0 (radio): #
- check:ad-live-shared:1 (radio): #
- check:ad-live-shared:2 (radio): #
- check:ad-live-update:0 (radio): —
- check:ad-reverse:0 (radio): One backward pass gives the gradient of the loss with respect to all # weights
- check:ad-reverse:1 (radio): Because the forward pass cannot be repeated
- check:ad-reverse:2 (radio): Because working backwards gives more exact gradients
- check:ad-shared:0 (radio): The sum of the two contributions that arrive at v
- check:ad-shared:1 (radio): The larger of the two contributions
- check:ad-shared:2 (radio): Only the first contribution to arrive
- check:ad-update:0 (radio): It averages them into ḡ, then w ← w − η·ḡ
- check:ad-update:1 (radio): It applies the # gradients one after another
- check:ad-update:2 (radio): It uses the largest of the # gradients
- d:x (range): x
- d:x:exact (input): x, exact value
- d:y (range): y
- d:y:exact (input): y, exact value
- e:net:2-16-16-1 (radio): ####
- e:net:2-2-1 (radio): ### (Experiment #)
- e:net:2-3-1 (radio): ###
- f:example:0 (radio): Example #
- f:example:1 (radio): Example #
- f:example:2 (radio): Example #
- f:example:3 (radio): Example #
- g:activation:relu (radio): relu
- g:activation:sigmoid (radio): sigmoid
- g:activation:tanh (radio): tanh
- g:batchSize:1 (radio): # (one example)
- g:batchSize:40 (radio): # (all)
- g:batchSize:8 (radio): #
- g:lr:0.05 (radio): #
- g:lr:0.5 (radio): #
- g:lr:2 (radio): #
- g:train (button): Train the network
- g:units:2 (radio): #
- g:units:3 (radio): #
- g:units:4 (radio): #
- next-experiment (a): Level # overview →
- tour:start (button): ▶ Start guided tour

**Information shown (headings, captions, legends)** (38)

- caption: Every gradient of f = (x₁ + x₂) · x₃
- caption: Every gradient of one example’s loss, ### (Experiment #)
- caption: What arrives at x in the reverse pass
- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: A calculation as a graph
- h3: A closed path
- h3: A rough estimate
- h3: A value used twice
- h3: Checking the gradients from outside
- h3: Final challenge: a batch’s average
- h3: Final challenge: before and after
- h3: Final challenge: follow one update
- h3: Forward mode and reverse mode
- h3: Forwards, then in reverse
- h3: The engine’s own graph
- h3: Train a network and take one update apart
- h3: Two contributions that cancel
- h3: Where a weight came from
- legend: Batch size
- legend: Example
- legend: Expression
- legend: Hidden activation
- legend: Hidden neurons
- legend: Learning rate η
- legend: Multiple choiceA value v is used by two operations. What is ∂f/∂v?
- legend: Multiple choiceWhy does the engine not compute gradients with finite differences?
- legend: Multiple choiceWith batch size # how does the engine turn the # examples’ gradients into one change of a weight w?
- legend: Network
- legend: Predict the output · uses your current settingsIn Part D, f = x · y + x with x = # and y = #. What is ∂f/∂x?
- legend: Predict the output · uses your current settingsIn Parts A to C, f = (x₁ + x₂) · x₃ at x₁ = #, x₂ = #, x₃ = #. What is ∂f
- legend: Predict the output · uses your current settingsIn the final challenge, what is a parameter’s value after an update?
- legend: ScenarioA network has # weights and one loss. Why does the engine compute gradients backwards, from the loss?
- legend: Step h

## learn: L3 experiment 01 (trained)

**Panels** (5)

- Learning objectives
- Learning rates to compare
- One recorded update
- Trace explorer
- What you will understand

**Controls (data-control id, element, accessible name)** (47)

- a:compare (button): Train these learning rates
- a:lr:0.05 (checkbox): η = #
- a:lr:0.5 (checkbox): η = #
- a:lr:2 (checkbox): η = #
- a:lr:30 (checkbox): η = #
- a:lr:8 (checkbox): η = #
- b:lr:0.05 (radio): #
- b:lr:0.5 (radio): #
- b:lr:2 (radio): #
- b:lr:30 (radio): #
- b:lr:8 (radio): #
- b:param (select): Parameterhidden weight x₁ → neuron #hidden weight x₁ → neuron #hidden weight x₁ → neuron #hidden weight x₁ → neuron #hid
- b:show (button): Show step ## in the record
- b:train (button): Train and record again
- b:update (range): Update number
- begin (a): Begin ↓
- check:l3-live-step:0 (radio): +#
- check:l3-live-step:1 (radio): #
- check:l3-live-step:2 (radio): +#
- check:lr-double:0 (radio): #
- check:lr-double:1 (radio): #
- check:lr-double:2 (radio): #
- check:lr-rise:0 (radio): The learning rate is too large: steps overshoot the lower ground
- check:lr-rise:1 (radio): The learning rate is too small
- check:lr-rise:2 (radio): The network has too few neurons
- check:lr-why-small:0 (radio): Training would need far more updates to get anywhere
- check:lr-why-small:1 (radio): Tiny learning rates make the gradient wrong
- check:lr-why-small:2 (radio): Tiny learning rates always diverge
- next-experiment (a): Next: # · Momentum: Smoothing the Update →
- tour:start (button): ▶ Start guided tour
- trace:back (button): ◀ Previous stage
- trace:detail:layers (radio): Layers
- trace:detail:operations (radio): Operations
- trace:detail:stages (radio): Stages
- trace:end (button): Go to the end of the run
- trace:epoch (button): Epoch #: average loss #
- trace:next (button): Next stage ▶
- trace:node:batch (button): Batch # of # · examples ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## 
- trace:node:batch (button): End of epoch: test every examplecheck
- trace:node:batch (button): Start of epoch: choose the order of the examplescontrol
- trace:play (button): ▶▶ Watch
- trace:position (range): Position in the record# / #
- trace:size:batch (radio): Batch
- trace:size:epoch (radio): Epoch
- trace:size:phase (radio): Stage
- trace:size:sample (radio): Example
- trace:start (button): Go to the start of the run

**Disclosure sections** (3)

- Loss after each epoch, for each learning rate: every value as a table
- Loss of the batch before each update: every value as a table
- Value of the hidden bias of neuron # after each update: every value as a table

**Information shown (headings, captions, legends)** (23)

- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: Catch an overshoot
- h3: Inside one run
- h3: Same network, different learning rates
- h3: The record of run #
- h3: The useful middle
- h3: Too careful
- h4: Before the run
- h4: Epochs
- h4: Inside epoch # of #
- legend: Detail
- legend: Learning rate η for the recorded run
- legend: Learning rates
- legend: Multiple choiceAt one update the mean gradient of a weight is ḡ = #. With η = # the step is #. What is it with η = #?
- legend: Multiple choiceWhy not always use a tiny learning rate to be safe?
- legend: Predict the output · uses your current settingsIn Part B, update #: the mean gradient is ḡ = # and η = #. What is the st
- legend: ScenarioA loss curve goes down, then up, then down again in big jumps. What is the most likely cause?
- legend: Step size

## learn: L3 experiment 01

**Panels** (3)

- Learning objectives
- Learning rates to compare
- What you will understand

**Controls (data-control id, element, accessible name)** (25)

- a:compare (button): Train these learning rates
- a:lr:0.05 (checkbox): η = #
- a:lr:0.5 (checkbox): η = #
- a:lr:2 (checkbox): η = #
- a:lr:30 (checkbox): η = #
- a:lr:8 (checkbox): η = #
- b:lr:0.05 (radio): #
- b:lr:0.5 (radio): #
- b:lr:2 (radio): #
- b:lr:30 (radio): #
- b:lr:8 (radio): #
- b:train (button): Train and record this run
- begin (a): Begin ↓
- check:l3-live-step:0 (radio): —
- check:lr-double:0 (radio): #
- check:lr-double:1 (radio): #
- check:lr-double:2 (radio): #
- check:lr-rise:0 (radio): The learning rate is too large: steps overshoot the lower ground
- check:lr-rise:1 (radio): The learning rate is too small
- check:lr-rise:2 (radio): The network has too few neurons
- check:lr-why-small:0 (radio): Training would need far more updates to get anywhere
- check:lr-why-small:1 (radio): Tiny learning rates make the gradient wrong
- check:lr-why-small:2 (radio): Tiny learning rates always diverge
- next-experiment (a): Next: # · Momentum: Smoothing the Update →
- tour:start (button): ▶ Start guided tour

**Information shown (headings, captions, legends)** (17)

- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: Catch an overshoot
- h3: Inside one run
- h3: Same network, different learning rates
- h3: The useful middle
- h3: Too careful
- legend: Learning rate η for the recorded run
- legend: Learning rates
- legend: Multiple choiceAt one update the mean gradient of a weight is ḡ = #. With η = # the step is #. What is it with η = #?
- legend: Multiple choiceWhy not always use a tiny learning rate to be safe?
- legend: Predict the output · uses your current settingsIn Part B, what is the step of an update?
- legend: ScenarioA loss curve goes down, then up, then down again in big jumps. What is the most likely cause?

## learn: L3 experiment 02 (trained)

**Panels** (5)

- Compare update rules
- Learning objectives
- One recorded update
- Trace explorer
- What you will understand

**Controls (data-control id, element, accessible name)** (40)

- a:compare (button): Train the comparison
- b:mu:0 (radio): #
- b:mu:0.5 (radio): #
- b:mu:0.9 (radio): #
- b:param (select): Parameterhidden weight x₁ → neuron #hidden weight x₁ → neuron #hidden weight x₁ → neuron #hidden weight x₁ → neuron #hid
- b:show (button): Show step ## in the record
- b:train (button): Train and record again
- b:update (range): Update number
- begin (a): Begin ↓
- check:l3-live-velocity:0 (radio): +#
- check:l3-live-velocity:1 (radio): +#
- check:l3-live-velocity:2 (radio): +#
- check:mo-rule:0 (radio): #
- check:mo-rule:1 (radio): #
- check:mo-rule:2 (radio): #
- check:mo-state:0 (radio): One velocity for every parameter
- check:mo-state:1 (radio): A second learning rate
- check:mo-state:2 (radio): A copy of the training data
- check:mo-wobble:0 (radio): Makes them smaller: the opposite signs partly cancel in the velocity
- check:mo-wobble:1 (radio): Makes them larger
- check:mo-wobble:2 (radio): Nothing: momentum only changes the learning rate
- next-experiment (a): Next: # · Adam: Adaptive Optimization →
- tour:start (button): ▶ Start guided tour
- trace:back (button): ◀ Previous stage
- trace:detail:layers (radio): Layers
- trace:detail:operations (radio): Operations
- trace:detail:stages (radio): Stages
- trace:end (button): Go to the end of the run
- trace:epoch (button): Epoch #: average loss #
- trace:next (button): Next stage ▶
- trace:node:batch (button): Batch # of # · examples ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## 
- trace:node:batch (button): End of epoch: test every examplecheck
- trace:node:batch (button): Start of epoch: choose the order of the examplescontrol
- trace:play (button): ▶▶ Watch
- trace:position (range): Position in the record# / #
- trace:size:batch (radio): Batch
- trace:size:epoch (radio): Epoch
- trace:size:phase (radio): Stage
- trace:size:sample (radio): Example
- trace:start (button): Go to the start of the run

**Disclosure sections** (4)

- Loss after each epoch, with and without momentum: every value as a table
- Loss of the batch before each update: every value as a table
- Mean gradient ḡ and velocity v at each update: every value as a table
- Value of the output weight h₁ → output after each update: every value as a table

**Information shown (headings, captions, legends)** (22)

- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: Momentum without memory
- h3: Plain steps against momentum
- h3: Same η, better result
- h3: Speed builds up
- h3: The record of run #
- h3: The velocity, update by update
- h4: Before the run
- h4: Epochs
- h4: Inside epoch # of #
- legend: Detail
- legend: Momentum coefficient μ
- legend: Multiple choiceWhat extra does momentum keep between updates, compared with plain gradient descent?
- legend: Multiple choiceWith μ = #, the previous velocity is v = # and the new mean gradient is ḡ = #. What is the new velocity?
- legend: Predict the output · uses your current settingsIn Part B, update # (μ = #): the previous velocity is +# and the mean gra
- legend: ScenarioA parameter’s gradient flips sign every update (+, −, +, −). What does momentum do to its steps?
- legend: Step size

## learn: L3 experiment 02

**Panels** (3)

- Compare update rules
- Learning objectives
- What you will understand

**Controls (data-control id, element, accessible name)** (18)

- a:compare (button): Train the comparison
- b:mu:0 (radio): #
- b:mu:0.5 (radio): #
- b:mu:0.9 (radio): #
- b:train (button): Train and record the momentum run
- begin (a): Begin ↓
- check:l3-live-velocity:0 (radio): —
- check:mo-rule:0 (radio): #
- check:mo-rule:1 (radio): #
- check:mo-rule:2 (radio): #
- check:mo-state:0 (radio): One velocity for every parameter
- check:mo-state:1 (radio): A second learning rate
- check:mo-state:2 (radio): A copy of the training data
- check:mo-wobble:0 (radio): Makes them smaller: the opposite signs partly cancel in the velocity
- check:mo-wobble:1 (radio): Makes them larger
- check:mo-wobble:2 (radio): Nothing: momentum only changes the learning rate
- next-experiment (a): Next: # · Adam: Adaptive Optimization →
- tour:start (button): ▶ Start guided tour

**Information shown (headings, captions, legends)** (16)

- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: Momentum without memory
- h3: Plain steps against momentum
- h3: Same η, better result
- h3: Speed builds up
- h3: The velocity, update by update
- legend: Momentum coefficient μ
- legend: Multiple choiceWhat extra does momentum keep between updates, compared with plain gradient descent?
- legend: Multiple choiceWith μ = #, the previous velocity is v = # and the new mean gradient is ḡ = #. What is the new velocity?
- legend: Predict the output · uses your current settingsIn Part B, what is the new velocity of an update?
- legend: ScenarioA parameter’s gradient flips sign every update (+, −, +, −). What does momentum do to its steps?

## learn: L3 experiment 03 (trained)

**Panels** (5)

- Compare optimisers
- Learning objectives
- One recorded update
- Trace explorer
- What you will understand

**Controls (data-control id, element, accessible name)** (38)

- a:compare (button): Train the comparison
- b:param (select): Parameterhidden weight x₁ → neuron #hidden weight x₁ → neuron #hidden weight x₁ → neuron #hidden weight x₁ → neuron #hid
- b:show (button): Show step ## in the record
- b:train (button): Train and record again
- b:update (range): Update number
- begin (a): Begin ↓
- c:update (range): Update number for the step sizes
- check:ad-adaptive:0 (radio): Both at most about η: each gradient is divided by its own typical size, so the step does not grow with the gradient
- check:ad-adaptive:1 (radio): The second moves # times further
- check:ad-adaptive:2 (radio): The first moves # times further
- check:ad-correct:0 (radio): #
- check:ad-correct:1 (radio): #
- check:ad-correct:2 (radio): #
- check:ad-state:0 (radio): Two: m and v (and one step count for all)
- check:ad-state:1 (radio): One, like momentum
- check:ad-state:2 (radio): None
- check:l3-live-mhat:0 (radio): #
- check:l3-live-mhat:1 (radio): #
- check:l3-live-mhat:2 (radio): #
- next-experiment (a): Next: # · Overfitting and Regularization →
- tour:start (button): ▶ Start guided tour
- trace:back (button): ◀ Previous stage
- trace:detail:layers (radio): Layers
- trace:detail:operations (radio): Operations
- trace:detail:stages (radio): Stages
- trace:end (button): Go to the end of the run
- trace:epoch (button): Epoch #: average loss #
- trace:next (button): Next stage ▶
- trace:node:batch (button): Batch # of # · examples ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## 
- trace:node:batch (button): End of epoch: test every examplecheck
- trace:node:batch (button): Start of epoch: choose the order of the examplescontrol
- trace:play (button): ▶▶ Watch
- trace:position (range): Position in the record# / #
- trace:size:batch (radio): Batch
- trace:size:epoch (radio): Epoch
- trace:size:phase (radio): Stage
- trace:size:sample (radio): Example
- trace:start (button): Go to the start of the run

**Disclosure sections** (4)

- Loss after each epoch, for three optimisers: every value as a table
- Loss of the batch before each update: every value as a table
- Mean gradient ḡ and corrected first moment m̂ at each update: every value as a table
- Value of the output weight h₁ → output after each update: every value as a table

**Information shown (headings, captions, legends)** (22)

- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: A step sized for each parameter
- h3: Same step, different gradients
- h3: The first step
- h3: The moments, update by update
- h3: The record of run #
- h3: Three optimisers
- h3: Three optimisers, one task
- h4: Before the run
- h4: Epochs
- h4: Inside epoch # of #
- legend: Detail
- legend: Multiple choiceAt update # with β₁ = # and gradient ḡ = #: m = #. What is m̂ = m/(#−β₁¹)?
- legend: Multiple choiceHow many numbers does Adam keep for every parameter value, besides the value itself?
- legend: Predict the output · uses your current settingsIn Part B, update t = #: m = # and β₁ = #. What is m̂ = m / (# − β₁ᵗ)?
- legend: ScenarioOne weight always has gradients near #, another near #. With Adam, how do their steps compare?
- legend: Step size

## learn: L3 experiment 03

**Panels** (3)

- Compare optimisers
- Learning objectives
- What you will understand

**Controls (data-control id, element, accessible name)** (15)

- a:compare (button): Train the comparison
- b:train (button): Train and record the Adam run
- begin (a): Begin ↓
- check:ad-adaptive:0 (radio): Both at most about η: each gradient is divided by its own typical size, so the step does not grow with the gradient
- check:ad-adaptive:1 (radio): The second moves # times further
- check:ad-adaptive:2 (radio): The first moves # times further
- check:ad-correct:0 (radio): #
- check:ad-correct:1 (radio): #
- check:ad-correct:2 (radio): #
- check:ad-state:0 (radio): Two: m and v (and one step count for all)
- check:ad-state:1 (radio): One, like momentum
- check:ad-state:2 (radio): None
- check:l3-live-mhat:0 (radio): —
- next-experiment (a): Next: # · Overfitting and Regularization →
- tour:start (button): ▶ Start guided tour

**Information shown (headings, captions, legends)** (16)

- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: A step sized for each parameter
- h3: Same step, different gradients
- h3: The first step
- h3: The moments, update by update
- h3: Three optimisers
- h3: Three optimisers, one task
- legend: Multiple choiceAt update # with β₁ = # and gradient ḡ = #: m = #. What is m̂ = m/(#−β₁¹)?
- legend: Multiple choiceHow many numbers does Adam keep for every parameter value, besides the value itself?
- legend: Predict the output · uses your current settingsIn Part B, what is the corrected first moment m̂?
- legend: ScenarioOne weight always has gradients near #, another near #. With Adam, how do their steps compare?

## learn: L3 experiment 04 (trained)

**Panels** (4)

- Compare weight decay
- Learning objectives
- Trace explorer
- What you will understand

**Controls (data-control id, element, accessible name)** (40)

- a:epoch (range): Epoch to inspect
- a:lambda:0 (radio): #
- a:lambda:0.003 (radio): #
- a:lambda:0.01 (radio): #
- a:lambda:0.03 (radio): #
- a:train (button): Train and record
- b:compare (button): Train the comparison
- begin (a): Begin ↓
- c:update (range): Update number for weight decay
- check:l3-live-decay:0 (radio): #
- check:l3-live-decay:1 (radio): #
- check:l3-live-decay:2 (radio): #
- check:of-decay:0 (radio): #
- check:of-decay:1 (radio): #
- check:of-decay:2 (radio): #
- check:of-sign:0 (radio): Overfitting: the network is learning details of the training points that do not hold for new ones
- check:of-sign:1 (radio): The learning rate is too large
- check:of-sign:2 (radio): The held-out data are wrong
- check:of-why-heldout:0 (radio): Otherwise their loss would no longer show how the network does on data it has not seen
- check:of-why-heldout:1 (radio): They would make training slower
- check:of-why-heldout:2 (radio): The engine cannot compute their gradient
- next-experiment (a): Level # overview →
- tour:start (button): ▶ Start guided tour
- trace:back (button): ◀ Previous stage
- trace:detail:layers (radio): Layers
- trace:detail:operations (radio): Operations
- trace:detail:stages (radio): Stages
- trace:end (button): Go to the end of the run
- trace:epoch (button): Epoch #: average loss #
- trace:next (button): Next stage ▶
- trace:node:batch (button): Batch # of # · examples ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ## ##
- trace:node:batch (button): End of epoch: test every examplecheck
- trace:node:batch (button): Start of epoch: choose the order of the examplescontrol
- trace:play (button): ▶▶ Watch
- trace:position (range): Position in the record# / #
- trace:size:batch (radio): Batch
- trace:size:epoch (radio): Epoch
- trace:size:phase (radio): Stage
- trace:size:sample (radio): Example
- trace:start (button): Go to the start of the run

**Disclosure sections** (2)

- Held-out loss after each epoch, for each λ: every value as a table
- Training and held-out loss after each epoch: every value as a table

**Information shown (headings, captions, legends)** (25)

- figcaption: After epoch #: shaded where the network answers #. The marks are the # training points.
- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: Different amounts of weight decay
- h3: The record of run #
- h3: The right amount
- h3: Too much of a good thing
- h3: Training loss is not the goal
- h3: Weight decay inside an update
- h3: Where to stop
- h4: Before the run
- h4: Epochs
- h4: Inside epoch # of #
- h4: The network’s decision after epoch #
- legend: Detail
- legend: Multiple choiceWhy must the held-out points never be used for updates?
- legend: Multiple choiceWith weight decay λ = #, a weight w = # has mean gradient ḡ = #. What gradient does the optimiser receive
- legend: Predict the output · uses your current settingsIn Part C, update #: the weight is w = #, its mean gradient ḡ = #, and λ 
- legend: ScenarioTraining loss falls steadily; held-out loss falls, then rises. What is happening?
- legend: Step size
- legend: Weight decay λ for the recorded run

## learn: L3 experiment 04

**Panels** (3)

- Compare weight decay
- Learning objectives
- What you will understand

**Controls (data-control id, element, accessible name)** (19)

- a:lambda:0 (radio): #
- a:lambda:0.003 (radio): #
- a:lambda:0.01 (radio): #
- a:lambda:0.03 (radio): #
- a:train (button): Train and record
- b:compare (button): Train the comparison
- begin (a): Begin ↓
- check:l3-live-decay:0 (radio): —
- check:of-decay:0 (radio): #
- check:of-decay:1 (radio): #
- check:of-decay:2 (radio): #
- check:of-sign:0 (radio): Overfitting: the network is learning details of the training points that do not hold for new ones
- check:of-sign:1 (radio): The learning rate is too large
- check:of-sign:2 (radio): The held-out data are wrong
- check:of-why-heldout:0 (radio): Otherwise their loss would no longer show how the network does on data it has not seen
- check:of-why-heldout:1 (radio): They would make training slower
- check:of-why-heldout:2 (radio): The engine cannot compute their gradient
- next-experiment (a): Level # overview →
- tour:start (button): ▶ Start guided tour

**Information shown (headings, captions, legends)** (17)

- h2: Afterwards you will understand
- h2: Explore
- h2: In this experiment you will
- h2: Key ideas
- h2: Knowledge check
- h2: The experiment
- h3: Different amounts of weight decay
- h3: The right amount
- h3: Too much of a good thing
- h3: Training loss is not the goal
- h3: Weight decay inside an update
- h3: Where to stop
- legend: Multiple choiceWhy must the held-out points never be used for updates?
- legend: Multiple choiceWith weight decay λ = #, a weight w = # has mean gradient ḡ = #. What gradient does the optimiser receive
- legend: Predict the output · uses your current settingsIn Part C, what gradient does the optimiser receive with weight decay?
- legend: ScenarioTraining loss falls steadily; held-out loss falls, then rises. What is happening?
- legend: Weight decay λ for the recorded run

## learn: level 1

**Controls (data-control id, element, accessible name)** (1)

- start-level (a): Start learning →

**Information shown (headings, captions, legends)** (8)

- h2: By the end you will understand
- h2: Your path
- h3: Experiment #: Inside a Neuron
- h3: Experiment #: Linear vs Nonlinear Transformations
- h3: Experiment #: Multilayer Perceptron: From Architecture to Training Trace
- h3: Experiment #: Perceptrons and Logic Gates
- h3: Level # assessment
- h3: Orientation: AI, ML and DL

## learn: level 2

**Controls (data-control id, element, accessible name)** (1)

- start-level-2 (a): Start Level # →

**Information shown (headings, captions, legends)** (7)

- h2: By the end you will understand
- h2: Your path
- h3: Experiment #: Automatic Differentiation: Inside the Computational Graph
- h3: Experiment #: Backpropagation: How Errors Travel Through a Network
- h3: Experiment #: Derivatives and Gradient Descent: How Parameters Learn
- h3: Experiment #: Forward Propagation: From Input to Prediction
- h3: Experiment #: Loss Functions: Measuring Prediction Error

## learn: level 3

**Controls (data-control id, element, accessible name)** (1)

- start-level-3 (a): Start Level # →

**Information shown (headings, captions, legends)** (6)

- h2: By the end you will understand
- h2: Your path
- h3: Experiment #: Adam: Adaptive Optimization
- h3: Experiment #: Learning Rate and Training Dynamics
- h3: Experiment #: Momentum: Smoothing the Update
- h3: Experiment #: Overfitting and Regularization

## learn: levels

**Controls (data-control id, element, accessible name)** (1)

- open-workbench (a): Open the workbench

**Information shown (headings, captions, legends)** (2)

- h2: Level # — Beginner: Neural Network Foundations
- h2: Levels # and beyond

## learn: orientation

**Controls (data-control id, element, accessible name)** (1)

- next-experiment (a): Start Experiment # · Inside a Neuron →

**Information shown (headings, captions, legends)** (4)

- h2: Artificial intelligence (AI)
- h2: Deep learning (DL)
- h2: How this lab works
- h2: Machine learning (ML)

## loss (expert)

**Panels** (10)

- Check your understanding
- Execution controls
- Experiment panels
- Explanation
- Guided walkthrough
- Inspector
- Network structure view
- Neural execution view
- Training state view
- Try it

**Controls (data-control id, element, accessible name)** (69)

- back (button): ◀ Back
- breakpoint:deadRelu (checkbox): a ReLU unit is inactive for a whole epoch
- breakpoint:exploding (checkbox): a gradient explodes (any /g/ > #)
- breakpoint:gradInit (checkbox): back-propagation starts (each example)
- breakpoint:lossIncrease (checkbox): the epoch loss rises by more than # %
- breakpoint:lossPlateau (checkbox): the epoch loss stops decreasing
- breakpoint:nonFinite (checkbox): NaN or infinity appears
- breakpoint:vanishing (checkbox): a layer’s gradient vanishes (all /g/ < #⁻⁴)
- chart:heatmap (rect): Epoch # weights into the output layer: gradient size #
- chart:pick (svg): Accuracy per epoch. training set: latest #.
- chart:pick (svg): Accuracy per epoch. training set: no data yet.
- chart:pick (svg): Loss per epoch. training (running mean): latest #; evaluation (end of epoch): latest #.
- chart:pick (svg): Loss per epoch. training (running mean): no data yet; evaluation (end of epoch): no data yet.
- chart:table (summary): Table view of the epoch data
- explain:detailed (button): Detailed
- explain:maths (button): Show the maths
- explain:novice (button): Simple
- explain:numbers (button): Show this step's numbers
- export:caption (textarea): Caption
- export:csv (button): Forward pass — gaussians: download CSV data
- export:csv (button): Network architecture: download CSV data
- export:csv (button): The training run as a trace of instructions: download CSV data
- export:mode (button): Colour
- export:mode (button): Greyscale
- export:mode (button): High contrast
- export:open (summary): Export figures
- export:pdf (button): Forward pass — gaussians: save as PDF via the print dialog
- export:pdf (button): Network architecture: save as PDF via the print dialog
- export:pdf (button): The training run as a trace of instructions: save as PDF via the print dialog
- export:refresh (button): Refresh at current position
- export:svg (button): Forward pass — gaussians: download SVG
- export:svg (button): Network architecture: download SVG
- export:svg (button): The training run as a trace of instructions: download SVG
- export:zip (button): All figures (.zip)
- play (button): ▶▶ Run
- reset-experiment (button): ↺ Reset experiment
- rewind (button): ⏮ Start
- scrub (range): Position
- select:edge (g): Weight from Input unit # to Output (sigmoid) unit #: #
- select:unit (g): Input, unit #: not yet computed
- select:unit (g): Input, unit #: value #
- select:unit (g): Output (sigmoid), unit #: not yet computed
- select:unit (g): Output (sigmoid), unit #: value #, gradient #, bias #
- selfcheck:lo1 (radio): They are equal
- selfcheck:lo1 (radio): ŷ = #
- selfcheck:lo2 (radio): the accuracy is # %
- selfcheck:lo2 (radio): the network has stopped learning
- selfcheck:lo2 (radio): the prediction equals the target
- speed (range): Speed
- step (button): Step ▶
- step-size:batch (button): Batch
- step-size:epoch (button): Epoch
- step-size:layer (button): Layer
- step-size:operation (button): Operation
- step-size:phase (button): Phase
- step-size:sample (button): Example
- structure:expand (button): L#dense · sigmoid→ [#]# params▸
- to-breakpoint (button): ⇥ To breakpoint
- tryit:0 (select): Loss function
- tryit:1 (text): Calculator: prediction ŷ
- tryit:1:slider (range): Calculator: prediction ŷ (drag)
- tryit:2 (text): Calculator: target y
- tryit:2:slider (range): Calculator: target y (drag)
- tryit:3 (text): Random seed (the starting point of the random numbers)
- tryit:more (summary): More settings
- walkthrough:hide (button): Hide
- walkthrough:next (button): Next ▶
- walkthrough:prev (button): ◀ Previous
- walkthrough:show-me (button): Run to the loss

**Disclosure sections** (3)

- Export figures
- More settings
- Table view of the epoch data

**Information shown (headings, captions, legends)** (25)

- figcaption: Accuracy per epoch
- figcaption: Decision boundary
- figcaption: Decision boundary after epoch #
- figcaption: Gradient magnitude per layer, by epoch
- figcaption: L# batch gradient
- figcaption: L# weights
- figcaption: Loss per epoch
- figcaption: Two losses for the same prediction (target y = #)
- h2: Check your understanding
- h2: Export figures
- h2: Inspector
- h2: Network structure
- h2: Step through training
- h2: Training so far
- h2: Try it
- h2: Walkthrough · # of #
- h2: What just happened
- h3: Calculator
- h3: Distributions at this point
- h3: What changed since the previous step
- legend: #. A loss of exactly # means…
- legend: #. For a target of # which prediction has the larger cross-entropy loss?
- legend: Pause automatically when…
- legend: Step size
- p: positive weight (solid) negative weight (dashed) · line thickness = /weight/ · number in each neuron = its current value

## loss (novice)

**Panels** (10)

- Check your understanding
- Execution controls
- Experiment panels
- Explanation
- Guided walkthrough
- Inspector
- Network structure view
- Neural execution view
- Training state view
- Try it

**Controls (data-control id, element, accessible name)** (50)

- back (button): ◀ Back
- breakpoint:deadRelu (checkbox): a ReLU unit is inactive for a whole epoch
- breakpoint:exploding (checkbox): a gradient explodes (any /g/ > #)
- breakpoint:gradInit (checkbox): back-propagation starts (each example)
- breakpoint:lossIncrease (checkbox): the epoch loss rises by more than # %
- breakpoint:lossPlateau (checkbox): the epoch loss stops decreasing
- breakpoint:nonFinite (checkbox): NaN or infinity appears
- breakpoint:vanishing (checkbox): a layer’s gradient vanishes (all /g/ < #⁻⁴)
- chart:heatmap (rect): Epoch # weights into the output layer: gradient size #
- chart:pick (svg): Accuracy per epoch. training set: latest #.
- chart:pick (svg): Accuracy per epoch. training set: no data yet.
- chart:pick (svg): Loss per epoch. training (running mean): latest #; evaluation (end of epoch): latest #.
- chart:pick (svg): Loss per epoch. training (running mean): no data yet; evaluation (end of epoch): no data yet.
- chart:table (summary): Table view of the epoch data
- explain:detailed (button): Detailed
- explain:maths (button): Show the maths
- explain:novice (button): Simple
- explain:numbers (button): Show this step's numbers
- more-controls (summary): More controls: pause automatically
- play (button): ▶▶ Run
- reset-experiment (button): ↺ Reset experiment
- rewind (button): ⏮ Start
- scrub (range): Position
- select:edge (g): Weight from Input unit # to Output (sigmoid) unit #: #
- select:unit (g): Input, unit #: not yet computed
- select:unit (g): Input, unit #: value #
- select:unit (g): Output (sigmoid), unit #: not yet computed
- select:unit (g): Output (sigmoid), unit #: value #, gradient #, bias #
- selfcheck:lo1 (radio): They are equal
- selfcheck:lo1 (radio): ŷ = #
- selfcheck:lo2 (radio): the accuracy is # %
- selfcheck:lo2 (radio): the network has stopped learning
- selfcheck:lo2 (radio): the prediction equals the target
- speed (range): Speed
- step (button): Step ▶
- step-size:layer (button): one layer
- step-size:operation (button): one calculation
- structure:expand (button): The output layerdense · sigmoid→ [#]# params▸
- to-breakpoint (button): ⇥ To breakpoint
- tryit:0 (select): Loss function
- tryit:1 (text): Calculator: prediction ŷ
- tryit:1:slider (range): Calculator: prediction ŷ (drag)
- tryit:2 (text): Calculator: target y
- tryit:2:slider (range): Calculator: target y (drag)
- tryit:3 (text): Random seed (the starting point of the random numbers)
- tryit:more (summary): More settings
- walkthrough:hide (button): Hide
- walkthrough:next (button): Next ▶
- walkthrough:prev (button): ◀ Previous
- walkthrough:show-me (button): Run to the loss

**Disclosure sections** (3)

- More controls: pause automatically
- More settings
- Table view of the epoch data

**Information shown (headings, captions, legends)** (24)

- figcaption: Accuracy per epoch
- figcaption: Decision boundary
- figcaption: Decision boundary after epoch #
- figcaption: Gradient magnitude per layer, by epoch
- figcaption: L# batch gradient
- figcaption: L# weights
- figcaption: Loss per epoch
- figcaption: Two losses for the same prediction (target y = #)
- h2: Check your understanding
- h2: Inspector
- h2: Network structure
- h2: Step through training
- h2: Training so far
- h2: Try it
- h2: Walkthrough · # of #
- h2: What just happened
- h3: Calculator
- h3: Distributions at this point
- h3: What changed since the previous step
- legend: #. A loss of exactly # means…
- legend: #. For a target of # which prediction has the larger cross-entropy loss?
- legend: Pause automatically when…
- legend: Step size
- p: positive weight (solid) negative weight (dashed) · line thickness = /weight/ · number in each neuron = its current value

## lr-pathology (expert)

**Panels** (10)

- Check your understanding
- Execution controls
- Experiment panels
- Explanation
- Guided walkthrough
- Inspector
- Network structure view
- Neural execution view
- Training state view
- Try it

**Controls (data-control id, element, accessible name)** (65)

- back (button): ◀ Back
- breakpoint:deadRelu (checkbox): a ReLU unit is inactive for a whole epoch
- breakpoint:exploding (checkbox): a gradient explodes (any /g/ > #)
- breakpoint:gradInit (checkbox): back-propagation starts (each example)
- breakpoint:lossIncrease (checkbox): the epoch loss rises by more than # %
- breakpoint:lossPlateau (checkbox): the epoch loss stops decreasing
- breakpoint:nonFinite (checkbox): NaN or infinity appears
- breakpoint:vanishing (checkbox): a layer’s gradient vanishes (all /g/ < #⁻⁴)
- chart:heatmap (rect): Epoch # weights into the output layer: gradient size #
- chart:pick (svg): Loss per epoch. training (running mean): latest #; evaluation (end of epoch): latest #.
- chart:pick (svg): Loss per epoch. training (running mean): no data yet; evaluation (end of epoch): no data yet.
- chart:table (summary): Table view of the epoch data
- explain:detailed (button): Detailed
- explain:maths (button): Show the maths
- explain:novice (button): Simple
- explain:numbers (button): Show this step's numbers
- export:caption (textarea): Caption
- export:csv (button): Forward pass — line: download CSV data
- export:csv (button): Network architecture: download CSV data
- export:csv (button): The training run as a trace of instructions: download CSV data
- export:mode (button): Colour
- export:mode (button): Greyscale
- export:mode (button): High contrast
- export:open (summary): Export figures
- export:pdf (button): Forward pass — line: save as PDF via the print dialog
- export:pdf (button): Network architecture: save as PDF via the print dialog
- export:pdf (button): The training run as a trace of instructions: save as PDF via the print dialog
- export:refresh (button): Refresh at current position
- export:svg (button): Forward pass — line: download SVG
- export:svg (button): Network architecture: download SVG
- export:svg (button): The training run as a trace of instructions: download SVG
- export:zip (button): All figures (.zip)
- play (button): ▶▶ Run
- reset-experiment (button): ↺ Reset experiment
- rewind (button): ⏮ Start
- scrub (range): Position
- select:edge (g): Weight from Input unit # to Output (linear) unit #: #
- select:unit (g): Input, unit #: not yet computed
- select:unit (g): Input, unit #: value #
- select:unit (g): Output (linear), unit #: not yet computed
- select:unit (g): Output (linear), unit #: value #, gradient #, bias #
- selfcheck:lr1 (radio): a little too large
- selfcheck:lr1 (radio): exactly right
- selfcheck:lr1 (radio): too small
- selfcheck:lr2 (radio): NaN
- selfcheck:lr2 (radio): oscillating
- selfcheck:lr2 (radio): still decreasing slowly, far from its minimum
- speed (range): Speed
- step (button): Step ▶
- step-size:batch (button): Batch
- step-size:epoch (button): Epoch
- step-size:layer (button): Layer
- step-size:operation (button): Operation
- step-size:phase (button): Phase
- step-size:sample (button): Example
- structure:expand (button): L#dense · linear→ [#]# params▸
- to-breakpoint (button): ⇥ To breakpoint
- tryit:0 (text): Learning rate η
- tryit:1 (text): Compared learning rate #
- tryit:2 (text): Compared learning rate #
- tryit:3 (text): Compared learning rate #
- tryit:4 (text): Compared learning rate #
- walkthrough:hide (button): Hide
- walkthrough:next (button): Next ▶
- walkthrough:prev (button): ◀ Previous

**Disclosure sections** (2)

- Export figures
- Table view of the epoch data

**Information shown (headings, captions, legends)** (22)

- figcaption: Gradient magnitude per layer, by epoch
- figcaption: L# batch gradient
- figcaption: L# weights
- figcaption: Loss per epoch
- figcaption: Loss surface L(w, b) and the path of gradient descent
- figcaption: The same model trained with # learning rates
- h2: Check your understanding
- h2: Export figures
- h2: Inspector
- h2: Network structure
- h2: Step through training
- h2: Training so far
- h2: Try it
- h2: Walkthrough · # of #
- h2: What just happened
- h3: Distributions at this point
- h3: What changed since the previous step
- legend: #. The loss falls every epoch, but more slowly than with a smaller learning rate, and the path of the parameters swings 
- legend: #. With a learning rate that is far too small, after many epochs the loss is…
- legend: Pause automatically when…
- legend: Step size
- p: positive weight (solid) negative weight (dashed) · line thickness = /weight/ · number in each neuron = its current value

## lr-pathology (novice)

**Panels** (10)

- Check your understanding
- Execution controls
- Experiment panels
- Explanation
- Guided walkthrough
- Inspector
- Network structure view
- Neural execution view
- Training state view
- Try it

**Controls (data-control id, element, accessible name)** (50)

- back (button): ◀ Back
- breakpoint:deadRelu (checkbox): a ReLU unit is inactive for a whole epoch
- breakpoint:exploding (checkbox): a gradient explodes (any /g/ > #)
- breakpoint:gradInit (checkbox): back-propagation starts (each example)
- breakpoint:lossIncrease (checkbox): the epoch loss rises by more than # %
- breakpoint:lossPlateau (checkbox): the epoch loss stops decreasing
- breakpoint:nonFinite (checkbox): NaN or infinity appears
- breakpoint:vanishing (checkbox): a layer’s gradient vanishes (all /g/ < #⁻⁴)
- chart:heatmap (rect): Epoch # weights into the output layer: gradient size #
- chart:pick (svg): Loss per epoch. training (running mean): latest #; evaluation (end of epoch): latest #.
- chart:pick (svg): Loss per epoch. training (running mean): no data yet; evaluation (end of epoch): no data yet.
- chart:table (summary): Table view of the epoch data
- explain:detailed (button): Detailed
- explain:maths (button): Show the maths
- explain:novice (button): Simple
- explain:numbers (button): Show this step's numbers
- more-controls (summary): More controls: pause automatically
- play (button): ▶▶ Run
- reset-experiment (button): ↺ Reset experiment
- rewind (button): ⏮ Start
- scrub (range): Position
- select:edge (g): Weight from Input unit # to Output (linear) unit #: #
- select:unit (g): Input, unit #: not yet computed
- select:unit (g): Input, unit #: value #
- select:unit (g): Output (linear), unit #: not yet computed
- select:unit (g): Output (linear), unit #: value #, gradient #, bias #
- selfcheck:lr1 (radio): a little too large
- selfcheck:lr1 (radio): exactly right
- selfcheck:lr1 (radio): too small
- selfcheck:lr2 (radio): NaN
- selfcheck:lr2 (radio): oscillating
- selfcheck:lr2 (radio): still decreasing slowly, far from its minimum
- speed (range): Speed
- step (button): Step ▶
- step-size:batch (button): one batch
- step-size:epoch (button): one full pass
- step-size:layer (button): one layer
- step-size:operation (button): one calculation
- step-size:phase (button): forward / backward / update
- step-size:sample (button): one example
- structure:expand (button): The output layerdense · linear→ [#]# params▸
- to-breakpoint (button): ⇥ To breakpoint
- tryit:0 (text): Learning rate η
- tryit:1 (text): Compared learning rate #
- tryit:2 (text): Compared learning rate #
- tryit:3 (text): Compared learning rate #
- tryit:4 (text): Compared learning rate #
- walkthrough:hide (button): Hide
- walkthrough:next (button): Next ▶
- walkthrough:prev (button): ◀ Previous

**Disclosure sections** (2)

- More controls: pause automatically
- Table view of the epoch data

**Information shown (headings, captions, legends)** (21)

- figcaption: Gradient magnitude per layer, by epoch
- figcaption: L# batch gradient
- figcaption: L# weights
- figcaption: Loss per epoch
- figcaption: Loss surface L(w, b) and the path of gradient descent
- figcaption: The same model trained with # learning rates
- h2: Check your understanding
- h2: Inspector
- h2: Network structure
- h2: Step through training
- h2: Training so far
- h2: Try it
- h2: Walkthrough · # of #
- h2: What just happened
- h3: Distributions at this point
- h3: What changed since the previous step
- legend: #. The loss falls every epoch, but more slowly than with a smaller learning rate, and the path of the parameters swings 
- legend: #. With a learning rate that is far too small, after many epochs the loss is…
- legend: Pause automatically when…
- legend: Step size
- p: positive weight (solid) negative weight (dashed) · line thickness = /weight/ · number in each neuron = its current value

## single-neuron (expert)

**Panels** (12)

- Check your understanding
- Compare two points
- Execution controls
- Explanation
- Guided walkthrough
- Inspector
- Network structure view
- Neural execution view
- Starting weights and biases
- The trace
- Training state view
- Try it

**Controls (data-control id, element, accessible name)** (113)

- back (button): ◀ Back
- breakpoint:deadRelu (checkbox): a ReLU unit is inactive for a whole epoch
- breakpoint:exploding (checkbox): a gradient explodes (any /g/ > #)
- breakpoint:gradInit (checkbox): back-propagation starts (each example)
- breakpoint:lossIncrease (checkbox): the epoch loss rises by more than # %
- breakpoint:lossPlateau (checkbox): the epoch loss stops decreasing
- breakpoint:nonFinite (checkbox): NaN or infinity appears
- breakpoint:vanishing (checkbox): a layer’s gradient vanishes (all /g/ < #⁻⁴)
- chart:heatmap (rect): Epoch # weights into the output layer: gradient size #
- chart:pick (svg): Accuracy per epoch. training set: latest #.
- chart:pick (svg): Accuracy per epoch. training set: no data yet.
- chart:pick (svg): Loss per epoch. training (running mean): latest #; evaluation (end of epoch): latest #.
- chart:pick (svg): Loss per epoch. training (running mean): no data yet; evaluation (end of epoch): no data yet.
- chart:table (summary): Table view of the epoch data
- compare:pin (button): Pin this point as A
- explain:detailed (button): Detailed
- explain:maths (button): Show the maths
- explain:novice (button): Simple
- explain:numbers (button): Show this step's numbers
- export:caption (textarea): Caption
- export:csv (button): Forward pass — and: download CSV data
- export:csv (button): Network architecture: download CSV data
- export:csv (button): The training run as a trace of instructions: download CSV data
- export:mode (button): Colour
- export:mode (button): Greyscale
- export:mode (button): High contrast
- export:open (summary): Export figures
- export:pdf (button): Forward pass — and: save as PDF via the print dialog
- export:pdf (button): Network architecture: save as PDF via the print dialog
- export:pdf (button): The training run as a trace of instructions: save as PDF via the print dialog
- export:refresh (button): Refresh at current position
- export:svg (button): Forward pass — and: download SVG
- export:svg (button): Network architecture: download SVG
- export:svg (button): The training run as a trace of instructions: download SVG
- export:zip (button): All figures (.zip)
- param:L1.b (button): Biases of the output layerL#.b[#]▸
- param:L1.W (button): Weights into the output layerL#.W[#×#]▸
- params (section): Starting weights and biases
- play (button): ▶▶ Run
- reset-experiment (button): ↺ Reset experiment
- rewind (button): ⏮ Start
- scrub (range): Position
- select:edge (g): Weight from Input unit # to Output (sigmoid) unit #: #
- select:unit (g): Input, unit #: not yet computed
- select:unit (g): Input, unit #: value #
- select:unit (g): Output (sigmoid), unit #: not yet computed
- select:unit (g): Output (sigmoid), unit #: value #, gradient #, bias #
- selfcheck:sn1 (radio): #
- selfcheck:sn2 (radio): decreases
- selfcheck:sn2 (radio): increases
- selfcheck:sn2 (radio): is unchanged unless an input is non-zero
- selfcheck:sn3 (radio): has become positive, close to w₁
- selfcheck:sn3 (radio): is still #: only the bias changes
- selfcheck:sn3 (radio): is still negative
- speed (range): Speed
- step (button): Step ▶
- step-size:batch (button): Batch
- step-size:epoch (button): Epoch
- step-size:layer (button): Layer
- step-size:operation (button): Operation
- step-size:phase (button): Phase
- step-size:sample (button): Example
- structure:expand (button): L#dense · sigmoid→ [#]# params▸
- to-breakpoint (button): ⇥ To breakpoint
- trace:epoch (select): Epoch any#
- trace:find (button): Find
- trace:kind (select): Kind anyINIT_PARAMEPOCH_BEGINBATCH_BEGINLOAD_INPUTMATMULADD_BIASACTIVATEFORWARD_LAYER_ENDCOMPUTE_LOSSGRAD_INITGRAD_ACTIV
- trace:layer (select): Layer anyL# (the output layer)
- trace:phase (select): Phase anyinitforwardlossbackwardupdateevalcontrol
- trace:row (button): ##Add the bias of each unit (or channel).ADD_BIASL# · forward · epoch #
- trace:row (button): ##Add the step to the parameter.APPLY_UPDATEL# · update · epoch #
- trace:row (button): ##Apply the activation function element-wise (softmax: per row).ACTIVATEL# · forward · epoch #
- trace:row (button): ##Average the per-example losses over the mini-batch.LOSS_REDUCE— · loss · epoch #
- trace:row (button): ##Average this parameter's per-example gradients over the mini-batch.GRAD_ACCUMULATEL# · update · epoch #
- trace:row (button): ##Compare this example's prediction with its target.COMPUTE_LOSS— · loss · epoch #
- trace:row (button): ##End of the mini-batch; parameters have been updated.BATCH_END— · control · epoch #
- trace:row (button): ##End of the pass; summarise its losses and per-parameter gradient and weight magnitudes.EPOCH_END— · control · epoch #
- trace:row (button): ##Evaluate the current model on the whole training set (no learning).EVAL_BEGIN— · eval · epoch #
- trace:row (button): ##Initialise one parameter tensor from a seeded distribution.INIT_PARAML# · init
- trace:row (button): ##Load one training example and its target.LOAD_INPUT— · forward · epoch #
- trace:row (button): ##Marks the end of one layer in the backward pass.BACKWARD_LAYER_ENDL# · backward · epoch #
- trace:row (button): ##Marks the end of one layer in the forward pass.FORWARD_LAYER_ENDL# · forward · epoch #
- trace:row (button): ##Multiply the incoming activations by the layer weight matrix.MATMULL# · forward · epoch #
- trace:row (button): ##Multiply the upstream gradient by the activation's derivative.GRAD_ACTIVATEL# · backward · epoch #
- trace:row (button): ##Report evaluation loss and accuracy (and the decision boundary for #-D data).EVAL_END— · eval · epoch #
- trace:row (button): ##Scale the (momentum-smoothed) gradient by −η to get the step.COMPUTE_UPDATEL# · update · epoch #
- trace:row (button): ##Start a mini-batch.BATCH_BEGIN— · control · epoch #
- trace:row (button): ##Start a pass over the training set (in a freshly shuffled order).EPOCH_BEGIN— · control · epoch #
- trace:row (button): ##Start back-propagation: the gradient of the loss with respect to the network output.GRAD_INIT— · backward · epoch #
- trace:row (button): ##The bias gradient is the upstream gradient (summed over a channel's positions).GRAD_BIASL# · backward · epoch #
- trace:row (button): ##Weight gradient: outer product of the layer input and the upstream gradient.GRAD_MATMUL_WL# · backward · epoch #
- trace:threshold (input): Gradient magnitude threshold
- trace:when (select): Below or above
- tryit:0 (text): starting weight w₁
- tryit:0:slider (range): starting weight w₁ (drag)
- tryit:1 (text): starting weight w₂
- tryit:1:slider (range): starting weight w₂ (drag)
- tryit:10 (text): input x₂ of example #
- tryit:11 (text): Random seed (the starting point of the random numbers)
- tryit:2 (text): starting bias b
- tryit:2:slider (range): starting bias b (drag)
- tryit:3 (text): input x₁ of example #
- tryit:4 (text): input x₂ of example #
- tryit:5 (text): input x₁ of example #
- tryit:6 (text): input x₂ of example #
- tryit:7 (text): input x₁ of example #
- tryit:8 (text): input x₂ of example #
- tryit:9 (text): input x₁ of example #
- tryit:more (summary): More settings
- walkthrough:hide (button): Hide
- walkthrough:next (button): Next ▶
- walkthrough:prev (button): ◀ Previous
- walkthrough:show-me (button): Load the first example

**Disclosure sections** (3)

- Export figures
- More settings
- Table view of the epoch data

**Information shown (headings, captions, legends)** (27)

- figcaption: Accuracy per epoch
- figcaption: Decision boundary
- figcaption: Decision boundary after epoch #
- figcaption: Gradient magnitude per layer, by epoch
- figcaption: L# batch gradient
- figcaption: L# weights
- figcaption: Loss per epoch
- h2: Check your understanding
- h2: Compare two points of the run
- h2: Export figures
- h2: Inspector
- h2: Network structure
- h2: Starting weights and biases
- h2: Step through training
- h2: The trace: every instruction of this run
- h2: Training so far
- h2: Try it
- h2: Walkthrough · # of #
- h2: What just happened
- h3: Distributions at this point
- h3: What changed since the previous step
- legend: #. If you increase the bias b while keeping the weights fixed, the neuron’s output for every input…
- legend: #. Let it learn from the starting settings (w₁ = #, w₂ = #, b = #). By the end of learning, the second weight w₂…
- legend: #. With x = (# #), w = (#, #) and b = # what is z?
- legend: Pause automatically when…
- legend: Step size
- p: positive weight (solid) negative weight (dashed) · line thickness = /weight/ · number in each neuron = its current value

## single-neuron (novice)

**Panels** (5)

- A worked example
- Check your understanding
- Going deeper
- The neuron
- Your settings

**Controls (data-control id, element, accessible name)** (41)

- back (button): ◀ Back
- deeper:expert (button): ⧉ Open the full workbench (expert mode)
- deeper:maths (button): ▾ Show the maths
- deeper:numbers (button): ▾ Show the numbers
- deeper:second-view (button): ▾ Add the decision line
- deeper:settings (button): ▾ Change the examples
- learn (button): Let it learn
- passed (details): On the way: that part of the calculation is finished; the error for this example was measured (#).That part of the calcu
- predict:option (button): ○ all four: “yes” only for (# #)
- predict:option (button): ○ all go down
- predict:option (button): ○ all go up
- predict:option (button): ○ stay the same
- predict:option (button): ○ three of the four
- predict:option (button): ○ two or fewer
- reset-experiment (button): ↺ Reset experiment
- row:pin (button): show example (# #) in the diagram
- selfcheck:sn1 (radio): #
- selfcheck:sn2 (radio): decreases
- selfcheck:sn2 (radio): increases
- selfcheck:sn2 (radio): is unchanged unless an input is non-zero
- selfcheck:sn3 (radio): has become positive, close to w₁
- selfcheck:sn3 (radio): is still #: only the bias changes
- selfcheck:sn3 (radio): is still negative
- solution (button): Show me settings that work
- step (button): Next: one calculation ▶
- tryit:0 (text): weight w₁
- tryit:0:slider (range): weight w₁ (drag)
- tryit:1 (text): weight w₂
- tryit:1:slider (range): weight w₂ (drag)
- tryit:10 (text): input x₂ of example #
- tryit:11 (text): Random seed (the starting point of the random numbers)
- tryit:2 (text): bias b
- tryit:2:slider (range): bias b (drag)
- tryit:3 (text): input x₁ of example #
- tryit:4 (text): input x₂ of example #
- tryit:5 (text): input x₁ of example #
- tryit:6 (text): input x₂ of example #
- tryit:7 (text): input x₁ of example #
- tryit:8 (text): input x₂ of example #
- tryit:9 (text): input x₁ of example #
- worked:dismiss (button): Got it: let me try

**Disclosure sections** (6)

- going deeper: Add the decision line
- going deeper: Change the examples
- going deeper: Open the full workbench (expert mode)
- going deeper: Show the maths
- going deeper: Show the numbers
- On the way: that part of the calculation is finished; the error for this example was measured (#).

**Information shown (headings, captions, legends)** (14)

- caption: Every value, with your settings
- caption: With your settings: the neuron’s output for each example (point at a row to see it in the diagram)
- figcaption: A solid line is a positive weight and a dashed line a negative one; the thicker the line, the larger the weight.
- figcaption: Example (# #) with your settings. A solid line is a positive weight and a dashed line a negative one; the thicker the li
- h2: Can one neuron learn AND — say “yes” only when both inputs are #? Set its two weights and its bias, then let it learn.
- h2: Check your understanding
- h3: A worked example: the neuron’s answer for x₁ = # x₂ = #
- h3: Going deeper
- h3: Your settings
- legend: #. If you increase the bias b while keeping the weights fixed, the neuron’s output for every input…
- legend: #. Let it learn from the starting settings (w₁ = #, w₂ = #, b = #). By the end of learning, the second weight w₂…
- legend: #. With x = (# #), w = (#, #) and b = # what is z?
- legend: Prediction about learning Once it has learned, on how many of the four examples will the neuron be right?
- legend: Prediction about the bias If you make the bias b larger, the neuron’s four outputs will…

## vanishing-gradients (expert)

**Panels** (10)

- Check your understanding
- Execution controls
- Explanation
- Guided walkthrough
- Inspector
- Network structure view
- Neural execution view
- Starting weights and biases
- Training state view
- Try it

**Controls (data-control id, element, accessible name)** (100)

- arch:activation (select): Activation of hidden layer #relutanhsigmoidlinear
- arch:add (button): + add hidden layer
- arch:apply (button): Apply and restart
- arch:epochs (text): Epochs
- arch:lr (text): Learning rate
- arch:remove (button): Remove hidden layer #
- arch:restore (button): restore defaults
- arch:width (text): Width of hidden layer #
- back (button): ◀ Back
- breakpoint:deadRelu (checkbox): a ReLU unit is inactive for a whole epoch
- breakpoint:exploding (checkbox): a gradient explodes (any /g/ > #)
- breakpoint:gradInit (checkbox): back-propagation starts (each example)
- breakpoint:lossIncrease (checkbox): the epoch loss rises by more than # %
- breakpoint:lossPlateau (checkbox): the epoch loss stops decreasing
- breakpoint:nonFinite (checkbox): NaN or infinity appears
- breakpoint:vanishing (checkbox): a layer’s gradient vanishes (all /g/ < #⁻⁴)
- chart:heatmap (rect): Epoch # weights into hidden layer #: gradient size #
- chart:heatmap (rect): Epoch # weights into the output layer: gradient size #
- chart:pick (svg): Accuracy per epoch. training set: latest #.
- chart:pick (svg): Accuracy per epoch. training set: no data yet.
- chart:pick (svg): Loss per epoch. training (running mean): latest #; evaluation (end of epoch): latest #.
- chart:pick (svg): Loss per epoch. training (running mean): no data yet; evaluation (end of epoch): no data yet.
- chart:table (summary): Table view of the epoch data
- explain:detailed (button): Detailed
- explain:maths (button): Show the maths
- explain:novice (button): Simple
- explain:numbers (button): Show this step's numbers
- export:caption (textarea): Caption
- export:csv (button): Forward pass — circles: download CSV data
- export:csv (button): Network architecture: download CSV data
- export:csv (button): The training run as a trace of instructions: download CSV data
- export:mode (button): Colour
- export:mode (button): Greyscale
- export:mode (button): High contrast
- export:open (summary): Export figures
- export:pdf (button): Forward pass — circles: save as PDF via the print dialog
- export:pdf (button): Network architecture: save as PDF via the print dialog
- export:pdf (button): The training run as a trace of instructions: save as PDF via the print dialog
- export:refresh (button): Refresh at current position
- export:svg (button): Forward pass — circles: download SVG
- export:svg (button): Network architecture: download SVG
- export:svg (button): The training run as a trace of instructions: download SVG
- export:zip (button): All figures (.zip)
- param:L1.b (button): Biases of hidden layer #L#.b[#]▸
- param:L1.W (button): Weights into hidden layer #L#.W[#×#]▸
- param:L2.b (button): Biases of hidden layer #L#.b[#]▸
- param:L2.W (button): Weights into hidden layer #L#.W[#×#]▸
- param:L3.b (button): Biases of hidden layer #L#.b[#]▸
- param:L3.W (button): Weights into hidden layer #L#.W[#×#]▸
- param:L4.b (button): Biases of hidden layer #L#.b[#]▸
- param:L4.W (button): Weights into hidden layer #L#.W[#×#]▸
- param:L5.b (button): Biases of hidden layer #L#.b[#]▸
- param:L5.W (button): Weights into hidden layer #L#.W[#×#]▸
- param:L6.b (button): Biases of hidden layer #L#.b[#]▸
- param:L6.W (button): Weights into hidden layer #L#.W[#×#]▸
- param:L7.b (button): Biases of hidden layer #L#.b[#]▸
- param:L7.W (button): Weights into hidden layer #L#.W[#×#]▸
- param:L8.b (button): Biases of hidden layer #L#.b[#]▸
- param:L8.W (button): Weights into hidden layer #L#.W[#×#]▸
- param:L9.b (button): Biases of the output layerL#.b[#]▸
- param:L9.W (button): Weights into the output layerL#.W[#×#]▸
- params (section): Starting weights and biases
- play (button): ▶▶ Run
- reset-experiment (button): ↺ Reset experiment
- rewind (button): ⏮ Start
- scrub (range): Position
- select:edge (g): Weight from Hidden # (sigmoid) unit # to Hidden # (sigmoid) unit #: #
- select:edge (g): Weight from Hidden # (sigmoid) unit # to Output (sigmoid) unit #: #
- select:edge (g): Weight from Input unit # to Hidden # (sigmoid) unit #: #
- select:unit (g): Hidden # (sigmoid), unit #: not yet computed
- select:unit (g): Hidden # (sigmoid), unit #: value #, gradient #, bias #
- select:unit (g): Input, unit #: not yet computed
- select:unit (g): Input, unit #: value #
- select:unit (g): Output (sigmoid), unit #: not yet computed
- select:unit (g): Output (sigmoid), unit #: value #, gradient #, bias #
- selfcheck:vg1 (radio): Each layer multiplies the gradient by σ′(z) ≤ #
- selfcheck:vg1 (radio): The early layers have fewer weights
- selfcheck:vg1 (radio): The learning rate is smaller for early layers
- selfcheck:vg2 (radio): Adding more sigmoid layers
- selfcheck:vg2 (radio): Training for more epochs
- selfcheck:vg2 (radio): Using ReLU in the hidden layers
- speed (range): Speed
- step (button): Step ▶
- step-size:batch (button): Batch
- step-size:epoch (button): Epoch
- step-size:layer (button): Layer
- step-size:operation (button): Operation
- step-size:phase (button): Phase
- step-size:sample (button): Example
- structure:expand (button): L#dense · sigmoid→ [#]# params▸
- to-breakpoint (button): ⇥ To breakpoint
- tryit:0 (select): Hidden activations
- tryit:1 (text): Hidden layers (depth)
- tryit:2 (text): Starting-weight scale (# = the usual size)
- tryit:3 (text): Random seed (the starting point of the random numbers)
- tryit:more (summary): More settings
- walkthrough:hide (button): Hide
- walkthrough:next (button): Next ▶
- walkthrough:prev (button): ◀ Previous
- walkthrough:show-me (button): Run to the breakpoint

**Disclosure sections** (3)

- Export figures
- More settings
- Table view of the epoch data

**Information shown (headings, captions, legends)** (25)

- figcaption: Accuracy per epoch
- figcaption: Decision boundary
- figcaption: Decision boundary after epoch #
- figcaption: Gradient magnitude per layer, by epoch
- figcaption: L# batch gradient
- figcaption: L# weights
- figcaption: Loss per epoch
- h2: Check your understanding
- h2: Export figures
- h2: Inspector
- h2: Network structure
- h2: Starting weights and biases
- h2: Step through training
- h2: Training so far
- h2: Try it
- h2: Walkthrough · # of #
- h2: What just happened
- h3: Distributions at this point
- h3: What changed since the previous step
- legend: #. Which change most directly reduces vanishing gradients here?
- legend: #. Why do gradients shrink layer by layer in a deep sigmoid network?
- legend: Change the network (restarts training)
- legend: Pause automatically when…
- legend: Step size
- p: positive weight (solid) negative weight (dashed) · line thickness = /weight/ · number in each neuron = its current value

## vanishing-gradients (novice)

**Panels** (10)

- Check your understanding
- Execution controls
- Explanation
- Guided walkthrough
- Inspector
- Network structure view
- Neural execution view
- Starting weights and biases
- Training state view
- Try it

**Controls (data-control id, element, accessible name)** (86)

- arch:activation (select): Activation of hidden layer #relutanhsigmoidlinear
- arch:add (button): + add hidden layer
- arch:apply (button): Apply and restart
- arch:epochs (text): Epochs
- arch:lr (text): Learning rate
- arch:remove (button): Remove hidden layer #
- arch:restore (button): restore defaults
- arch:width (text): Width of hidden layer #
- back (button): ◀ Back
- breakpoint:deadRelu (checkbox): a ReLU unit is inactive for a whole epoch
- breakpoint:exploding (checkbox): a gradient explodes (any /g/ > #)
- breakpoint:gradInit (checkbox): back-propagation starts (each example)
- breakpoint:lossIncrease (checkbox): the epoch loss rises by more than # %
- breakpoint:lossPlateau (checkbox): the epoch loss stops decreasing
- breakpoint:nonFinite (checkbox): NaN or infinity appears
- breakpoint:vanishing (checkbox): a layer’s gradient vanishes (all /g/ < #⁻⁴)
- chart:heatmap (rect): Epoch # weights into hidden layer #: gradient size #
- chart:heatmap (rect): Epoch # weights into the output layer: gradient size #
- chart:pick (svg): Accuracy per epoch. training set: latest #.
- chart:pick (svg): Accuracy per epoch. training set: no data yet.
- chart:pick (svg): Loss per epoch. training (running mean): latest #; evaluation (end of epoch): latest #.
- chart:pick (svg): Loss per epoch. training (running mean): no data yet; evaluation (end of epoch): no data yet.
- chart:table (summary): Table view of the epoch data
- explain:detailed (button): Detailed
- explain:maths (button): Show the maths
- explain:novice (button): Simple
- explain:numbers (button): Show this step's numbers
- more-controls (summary): More controls: pause automatically
- param:L1.b (button): Biases of hidden layer #[#]▸
- param:L1.W (button): Weights into hidden layer #[#×#]▸
- param:L2.b (button): Biases of hidden layer #[#]▸
- param:L2.W (button): Weights into hidden layer #[#×#]▸
- param:L3.b (button): Biases of hidden layer #[#]▸
- param:L3.W (button): Weights into hidden layer #[#×#]▸
- param:L4.b (button): Biases of hidden layer #[#]▸
- param:L4.W (button): Weights into hidden layer #[#×#]▸
- param:L5.b (button): Biases of hidden layer #[#]▸
- param:L5.W (button): Weights into hidden layer #[#×#]▸
- param:L6.b (button): Biases of hidden layer #[#]▸
- param:L6.W (button): Weights into hidden layer #[#×#]▸
- param:L7.b (button): Biases of hidden layer #[#]▸
- param:L7.W (button): Weights into hidden layer #[#×#]▸
- param:L8.b (button): Biases of hidden layer #[#]▸
- param:L8.W (button): Weights into hidden layer #[#×#]▸
- param:L9.b (button): Biases of the output layer[#]▸
- param:L9.W (button): Weights into the output layer[#×#]▸
- params (section): Starting weights and biases
- play (button): ▶▶ Run
- reset-experiment (button): ↺ Reset experiment
- rewind (button): ⏮ Start
- scrub (range): Position
- select:edge (g): Weight from Hidden # (sigmoid) unit # to Hidden # (sigmoid) unit #: #
- select:edge (g): Weight from Hidden # (sigmoid) unit # to Output (sigmoid) unit #: #
- select:edge (g): Weight from Input unit # to Hidden # (sigmoid) unit #: #
- select:unit (g): Hidden # (sigmoid), unit #: not yet computed
- select:unit (g): Hidden # (sigmoid), unit #: value #, gradient #, bias #
- select:unit (g): Input, unit #: not yet computed
- select:unit (g): Input, unit #: value #
- select:unit (g): Output (sigmoid), unit #: not yet computed
- select:unit (g): Output (sigmoid), unit #: value #, gradient #, bias #
- selfcheck:vg1 (radio): Each layer multiplies the gradient by σ′(z) ≤ #
- selfcheck:vg1 (radio): The early layers have fewer weights
- selfcheck:vg1 (radio): The learning rate is smaller for early layers
- selfcheck:vg2 (radio): Adding more sigmoid layers
- selfcheck:vg2 (radio): Training for more epochs
- selfcheck:vg2 (radio): Using ReLU in the hidden layers
- speed (range): Speed
- step (button): Step ▶
- step-size:batch (button): one batch
- step-size:epoch (button): one full pass
- step-size:layer (button): one layer
- step-size:operation (button): one calculation
- step-size:phase (button): forward / backward / update
- step-size:sample (button): one example
- structure:expand (button): Hidden layer #dense · sigmoid→ [#]# params▸
- structure:expand (button): The output layerdense · sigmoid→ [#]# params▸
- to-breakpoint (button): ⇥ To breakpoint
- tryit:0 (select): Hidden activations
- tryit:1 (text): Hidden layers (depth)
- tryit:2 (text): Starting-weight scale (# = the usual size)
- tryit:3 (text): Random seed (the starting point of the random numbers)
- tryit:more (summary): More settings
- walkthrough:hide (button): Hide
- walkthrough:next (button): Next ▶
- walkthrough:prev (button): ◀ Previous
- walkthrough:show-me (button): Run to the breakpoint

**Disclosure sections** (3)

- More controls: pause automatically
- More settings
- Table view of the epoch data

**Information shown (headings, captions, legends)** (24)

- figcaption: Accuracy per epoch
- figcaption: Decision boundary
- figcaption: Decision boundary after epoch #
- figcaption: Gradient magnitude per layer, by epoch
- figcaption: L# batch gradient
- figcaption: L# weights
- figcaption: Loss per epoch
- h2: Check your understanding
- h2: Inspector
- h2: Network structure
- h2: Starting weights and biases
- h2: Step through training
- h2: Training so far
- h2: Try it
- h2: Walkthrough · # of #
- h2: What just happened
- h3: Distributions at this point
- h3: What changed since the previous step
- legend: #. Which change most directly reduces vanishing gradients here?
- legend: #. Why do gradients shrink layer by layer in a deep sigmoid network?
- legend: Change the network (restarts training)
- legend: Pause automatically when…
- legend: Step size
- p: positive weight (solid) negative weight (dashed) · line thickness = /weight/ · number in each neuron = its current value

## xor-mlp (expert)

**Panels** (10)

- Check your understanding
- Execution controls
- Explanation
- Guided walkthrough
- Inspector
- Network structure view
- Neural execution view
- Starting weights and biases
- Training state view
- Try it

**Controls (data-control id, element, accessible name)** (86)

- arch:activation (select): Activation of hidden layer #relutanhsigmoidlinear
- arch:add (button): + add hidden layer
- arch:apply (button): Apply and restart
- arch:epochs (text): Epochs
- arch:lr (text): Learning rate
- arch:remove (button): Remove hidden layer #
- arch:restore (button): restore defaults
- arch:width (text): Width of hidden layer #
- back (button): ◀ Back
- breakpoint:deadRelu (checkbox): a ReLU unit is inactive for a whole epoch
- breakpoint:exploding (checkbox): a gradient explodes (any /g/ > #)
- breakpoint:gradInit (checkbox): back-propagation starts (each example)
- breakpoint:lossIncrease (checkbox): the epoch loss rises by more than # %
- breakpoint:lossPlateau (checkbox): the epoch loss stops decreasing
- breakpoint:nonFinite (checkbox): NaN or infinity appears
- breakpoint:vanishing (checkbox): a layer’s gradient vanishes (all /g/ < #⁻⁴)
- chart:heatmap (rect): Epoch # weights into hidden layer #: gradient size #
- chart:heatmap (rect): Epoch # weights into the output layer: gradient size #
- chart:pick (svg): Accuracy per epoch. training set: latest #.
- chart:pick (svg): Accuracy per epoch. training set: no data yet.
- chart:pick (svg): Loss per epoch. training (running mean): latest #; evaluation (end of epoch): latest #.
- chart:pick (svg): Loss per epoch. training (running mean): no data yet; evaluation (end of epoch): no data yet.
- chart:table (summary): Table view of the epoch data
- explain:detailed (button): Detailed
- explain:maths (button): Show the maths
- explain:novice (button): Simple
- explain:numbers (button): Show this step's numbers
- export:caption (textarea): Caption
- export:csv (button): Forward pass — xor: download CSV data
- export:csv (button): Network architecture: download CSV data
- export:csv (button): The training run as a trace of instructions: download CSV data
- export:mode (button): Colour
- export:mode (button): Greyscale
- export:mode (button): High contrast
- export:open (summary): Export figures
- export:pdf (button): Forward pass — xor: save as PDF via the print dialog
- export:pdf (button): Network architecture: save as PDF via the print dialog
- export:pdf (button): The training run as a trace of instructions: save as PDF via the print dialog
- export:refresh (button): Refresh at current position
- export:svg (button): Forward pass — xor: download SVG
- export:svg (button): Network architecture: download SVG
- export:svg (button): The training run as a trace of instructions: download SVG
- export:zip (button): All figures (.zip)
- param:L1.b (button): Biases of hidden layer #L#.b[#]▸
- param:L1.W (button): Weights into hidden layer #L#.W[#×#]▸
- param:L2.b (button): Biases of the output layerL#.b[#]▸
- param:L2.W (button): Weights into the output layerL#.W[#×#]▸
- params (section): Starting weights and biases
- play (button): ▶▶ Run
- reset-experiment (button): ↺ Reset experiment
- rewind (button): ⏮ Start
- scrub (range): Position
- select:edge (g): Weight from Hidden # (tanh) unit # to Output (sigmoid) unit #: #
- select:edge (g): Weight from Input unit # to Hidden # (tanh) unit #: #
- select:unit (g): Hidden # (tanh), unit #: not yet computed
- select:unit (g): Hidden # (tanh), unit #: value #, gradient #, bias #
- select:unit (g): Input, unit #: not yet computed
- select:unit (g): Input, unit #: value #
- select:unit (g): Output (sigmoid), unit #: not yet computed
- select:unit (g): Output (sigmoid), unit #: value #, gradient #, bias #
- selfcheck:xo1 (radio): Its decision boundary is a straight line, and XOR’s classes are not linearly separable
- selfcheck:xo1 (radio): Its learning rate is too small
- selfcheck:xo1 (radio): XOR has too few examples
- selfcheck:xo2 (radio): learn XOR faster
- selfcheck:xo2 (radio): need more epochs but succeed
- selfcheck:xo2 (radio): still fail on XOR
- speed (range): Speed
- step (button): Step ▶
- step-size:batch (button): Batch
- step-size:epoch (button): Epoch
- step-size:layer (button): Layer
- step-size:operation (button): Operation
- step-size:phase (button): Phase
- step-size:sample (button): Example
- structure:expand (button): L#dense · sigmoid→ [#]# params▸
- structure:expand (button): L#dense · tanh→ [#]# params▸
- to-breakpoint (button): ⇥ To breakpoint
- tryit:0 (text): Units in hidden layer #
- tryit:1 (text): Learning rate η
- tryit:2 (select): Activation of layer #
- tryit:3 (text): Epochs (passes over the data)
- tryit:4 (text): Random seed (the starting point of the random numbers)
- tryit:more (summary): More settings
- walkthrough:hide (button): Hide
- walkthrough:next (button): Next ▶
- walkthrough:prev (button): ◀ Previous

**Disclosure sections** (3)

- Export figures
- More settings
- Table view of the epoch data

**Information shown (headings, captions, legends)** (25)

- figcaption: Accuracy per epoch
- figcaption: Decision boundary
- figcaption: Decision boundary after epoch #
- figcaption: Gradient magnitude per layer, by epoch
- figcaption: L# batch gradient
- figcaption: L# weights
- figcaption: Loss per epoch
- h2: Check your understanding
- h2: Export figures
- h2: Inspector
- h2: Network structure
- h2: Starting weights and biases
- h2: Step through training
- h2: Training so far
- h2: Try it
- h2: Walkthrough · # of #
- h2: What just happened
- h3: Distributions at this point
- h3: What changed since the previous step
- legend: #. If the hidden layer used the linear (identity) activation, the network would…
- legend: #. Why can a single neuron not learn XOR?
- legend: Change the network (restarts training)
- legend: Pause automatically when…
- legend: Step size
- p: positive weight (solid) negative weight (dashed) · line thickness = /weight/ · number in each neuron = its current value

## xor-mlp (novice)

**Panels** (10)

- Check your understanding
- Execution controls
- Explanation
- Guided walkthrough
- Inspector
- Network structure view
- Neural execution view
- Starting weights and biases
- Training state view
- Try it

**Controls (data-control id, element, accessible name)** (71)

- arch:activation (select): Activation of hidden layer #relutanhsigmoidlinear
- arch:add (button): + add hidden layer
- arch:apply (button): Apply and restart
- arch:epochs (text): Epochs
- arch:lr (text): Learning rate
- arch:remove (button): Remove hidden layer #
- arch:restore (button): restore defaults
- arch:width (text): Width of hidden layer #
- back (button): ◀ Back
- breakpoint:deadRelu (checkbox): a ReLU unit is inactive for a whole epoch
- breakpoint:exploding (checkbox): a gradient explodes (any /g/ > #)
- breakpoint:gradInit (checkbox): back-propagation starts (each example)
- breakpoint:lossIncrease (checkbox): the epoch loss rises by more than # %
- breakpoint:lossPlateau (checkbox): the epoch loss stops decreasing
- breakpoint:nonFinite (checkbox): NaN or infinity appears
- breakpoint:vanishing (checkbox): a layer’s gradient vanishes (all /g/ < #⁻⁴)
- chart:heatmap (rect): Epoch # weights into hidden layer #: gradient size #
- chart:heatmap (rect): Epoch # weights into the output layer: gradient size #
- chart:pick (svg): Accuracy per epoch. training set: latest #.
- chart:pick (svg): Accuracy per epoch. training set: no data yet.
- chart:pick (svg): Loss per epoch. training (running mean): latest #; evaluation (end of epoch): latest #.
- chart:pick (svg): Loss per epoch. training (running mean): no data yet; evaluation (end of epoch): no data yet.
- chart:table (summary): Table view of the epoch data
- explain:detailed (button): Detailed
- explain:maths (button): Show the maths
- explain:novice (button): Simple
- explain:numbers (button): Show this step's numbers
- more-controls (summary): More controls: pause automatically
- param:L1.b (button): Biases of hidden layer #[#]▸
- param:L1.W (button): Weights into hidden layer #[#×#]▸
- param:L2.b (button): Biases of the output layer[#]▸
- param:L2.W (button): Weights into the output layer[#×#]▸
- params (section): Starting weights and biases
- play (button): ▶▶ Run
- reset-experiment (button): ↺ Reset experiment
- rewind (button): ⏮ Start
- scrub (range): Position
- select:edge (g): Weight from Hidden # (tanh) unit # to Output (sigmoid) unit #: #
- select:edge (g): Weight from Input unit # to Hidden # (tanh) unit #: #
- select:unit (g): Hidden # (tanh), unit #: not yet computed
- select:unit (g): Hidden # (tanh), unit #: value #, gradient #, bias #
- select:unit (g): Input, unit #: not yet computed
- select:unit (g): Input, unit #: value #
- select:unit (g): Output (sigmoid), unit #: not yet computed
- select:unit (g): Output (sigmoid), unit #: value #, gradient #, bias #
- selfcheck:xo1 (radio): Its decision boundary is a straight line, and XOR’s classes are not linearly separable
- selfcheck:xo1 (radio): Its learning rate is too small
- selfcheck:xo1 (radio): XOR has too few examples
- selfcheck:xo2 (radio): learn XOR faster
- selfcheck:xo2 (radio): need more epochs but succeed
- selfcheck:xo2 (radio): still fail on XOR
- speed (range): Speed
- step (button): Step ▶
- step-size:batch (button): one batch
- step-size:epoch (button): one full pass
- step-size:layer (button): one layer
- step-size:operation (button): one calculation
- step-size:phase (button): forward / backward / update
- step-size:sample (button): one example
- structure:expand (button): Hidden layer #dense · tanh→ [#]# params▸
- structure:expand (button): The output layerdense · sigmoid→ [#]# params▸
- to-breakpoint (button): ⇥ To breakpoint
- tryit:0 (text): Units in hidden layer #
- tryit:1 (text): Learning rate η
- tryit:2 (select): Activation of layer #
- tryit:3 (text): Epochs (passes over the data)
- tryit:4 (text): Random seed (the starting point of the random numbers)
- tryit:more (summary): More settings
- walkthrough:hide (button): Hide
- walkthrough:next (button): Next ▶
- walkthrough:prev (button): ◀ Previous

**Disclosure sections** (3)

- More controls: pause automatically
- More settings
- Table view of the epoch data

**Information shown (headings, captions, legends)** (24)

- figcaption: Accuracy per epoch
- figcaption: Decision boundary
- figcaption: Decision boundary after epoch #
- figcaption: Gradient magnitude per layer, by epoch
- figcaption: L# batch gradient
- figcaption: L# weights
- figcaption: Loss per epoch
- h2: Check your understanding
- h2: Inspector
- h2: Network structure
- h2: Starting weights and biases
- h2: Step through training
- h2: Training so far
- h2: Try it
- h2: Walkthrough · # of #
- h2: What just happened
- h3: Distributions at this point
- h3: What changed since the previous step
- legend: #. If the hidden layer used the linear (identity) activation, the network would…
- legend: #. Why can a single neuron not learn XOR?
- legend: Change the network (restarts training)
- legend: Pause automatically when…
- legend: Step size
- p: positive weight (solid) negative weight (dashed) · line thickness = /weight/ · number in each neuron = its current value
