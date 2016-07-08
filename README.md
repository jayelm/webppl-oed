# webppl-oed
Optimal Experiment Design for WebPPL models

## Table of Contents

  * [webppl-oed](#webppl-oed)
    * [Dependencies](#dependencies)
    * [Usage](#usage)
      * [Models](#models)
        * [Specification](#specification)
        * [Implementation](#implementation)
      * [OED/EIG](#oedeig)
        * [Usage](#usage-1)
        * [Returns](#returns)
      * [AIG](#aig)
        * [Usage](#usage-2)
        * [Returns](#returns-1)
      * [updatePosterior](#updateposterior)
        * [Usage](#usage-3)
        * [Returns](#returns-2)
      * [getBestExpt](#getbestexpt)
        * [Usage](#usage-4)
        * [Returns](#returns-3)
    * [Examples](#examples)

## Dependencies

- WebPPL (v0.80+)

## Usage

### Models

#### Specification

In OED, models are a conditional distribution on possible responses `y` for a
given experiment `x`. In WebPPL, we implement this as a function that takes two
arguments, an experiment `x` and a response `y`, and returns the log-likelihood
of the response given the experiment.

*For OED to work correctly, the sum of
the model's probabilities of the responses for each experiment should equal 1!*
This is often ensured by deferring to the scoring functions of builtin distributions
(e.g. `Binomial`). Another possibility, if the response space is not terribly
large, is to compute the probability tables beforehand and ensure the results
are sensible.

A strategy for modeling independent participants in experimental scenarios is
to first define a generative model for the (probabilistic) behavior of one
individual. Specifically, write a function that accepts an experiment `x` and
samples from the space of responses `y` given their likelihoods considering
`x`. Then it should be possible to create a linking function that aggregates
multiple independent participants and describes the behavior of an experimental
group as a more general distribution (e.g.  `Binomial`). This is demonstrated
in `examples/coin.wppl` with the `groupify` linking function.

#### Implementation

Once you have defined your models, you should assign them a name via the
`Model` constructor. For example:

```javascript
// Imagine the possible responses to an experiment are the numbers {0, 1,
// ... 20}. Thus "null" model weights each response equally, irrespective
// of the experiment.
var nullGroup = Model('nullGroup', function(x, y) {
    return randomInteger({n: 21}).score(y);
});
```

All `Model` does is return the same function after defining its `name` property
(you could also do this with `Object.defineProperty`). In cases where you are
programmatically creating multiple models as anonymous functions, your models
may not have useful names. Using `Model` is necessary for OED to work
correctly, and ensures that OED (and you!) can tell your models apart.

Given that your definition of the model space in `OED` usually consists of a
draw from an array of models, the shorthand function `Models` is available to
declare models in an object and collapse them into an array, using the keys of
the object as names:

```javascript
var models = Models({
    m1: function(x, y) { ... },
    m2: function(x, y) { ... },
    ...
}); // => Returns an array of functions, named 'm1', 'm2', etc.
```

### OED/EIG

#### Usage

`OED` accepts an `args` argument with 3 required properties: the model sampling
function `M`, the experiment sampling function `X`, and the response sampling
function `Y`. These functions must take no arguments, and return a randomly
sampled single item from the corresponding search space. Even if your search
spaces are easily enumerable, you must specify the functions as a sample from
that space, and `OED` will enumerate it. Usually, your prior on `M`, `X`, and
`Y` will be uniform: as a result, your sampling function should produce each
model/experiment/response with equal probability (e.g. via `uniformDraw` or
`flip`).

> New: instead of specifying a model sampling function e.g. `M`, you can
> specify a model prior, `mPrior`, which will override `M`. You should
> provide a model prior that has been given to you previously via
> `updatePosterior` or a similar function.

In other cases, the search spaces are not enumerable. Thus `OED` allows
performing inference on the spaces with the inference techniques built into
WebPPL. You can specify any or all of the inference methods with the optional
`infer` property of the `args` object, itself an object mapping keys to
inference functions. If a specific inference method is not specified, `OED`
will default to `Enumerate`.

There is one other option: `usePredictiveY`. This weights the `Y` prior by the
predictions of the promising models in the model space. This is a good
option for when you believe the model space contains the true model, as it will
give experiment suggestions that hone in more quickly to the true model.

These options are displayed in the following example:

```javascript
// Assume a trivial experiment scenario where the numbers 0-20 are experiments,
// and the same numbers are also responses.
OED({
    M: function() { uniformDraw([m1, m2, ...]) }, // Sampling from model prior
    mPrior: Marginal({ ... }), // Optional: specify a concrete model prior
    X: function() { randomInteger(21) }, // Sampling from experiment prior
    Y: function() { randomInteger(21) }, // Sampling from response prior
    infer: {
        M1: Enumerate, // Inference for model prior
        M2: Enumerate, // Inference for model posterior
        X: Enumerate, // Inference for experiments prior
        // Inference for response prior (as an example, using MCMC)
        Y: function(thunk) {
            Infer({method: 'MCMC', samples: 5000}, thunk)
        }
    },
    usePredictiveY: true // Use the model predictive prior on responses?
});
```

#### Returns

`OED` returns a marginal distribution on experiments. However, the probabilities
of the experiments are meaningless. What you care about is the support of the
distribution, which contains the EIG values.

```javascript
var eigDist = OED({ ... }).support();
```

In particular, each element of the
support of the `EIG` distribution is an object with  **two** properties:

- **x**: `experiment`. A specific experiment (sampled from the `X` function).
- **EIG**: `number`. The expected information gain from the experiment, defined
    by the *expected* [Kullback-Leibler divergence](https://en.wikipedia.org/wiki/Kullback%E2%80%93Leibler_divergence) (KL-divergence) between the model posterior and the model prior, conditioning on all possible results `y` for the experiment `x`.

If you are interested in the best experiment, use the utility function
`getBestExpt`, described later.

> Note that `OED` is an alias for `EIG`.

### AIG

#### Usage
To calculate the actual information gain from an experiment, use `AIG`. It
accepts a subset of the arguments supplied to `OED`:

```javascript
AIG({
    M: function() { uniformDraw([m1, m2, ...]) },
    mPrior: Marginal({ ... }), // Optional
    x: 15, // LITTLE x: the experiment tested
    y: 20, // LITTLE y: the observed response,
    infer: {
        // Since x and y are given, no infer.X, infer.Y
        M1: Enumerate,
        M2: Enumerate
    }
    // No usePredictiveY, since y is given.
});
```

#### Returns
`AIG` returns a single number, which is the information gain defined by the
*actual* KL-divergence
between the model posterior and the model prior after conditioning on the given
experiment and observed response.

### updatePosterior

#### Usage
If you wish to obtain the actual updated model posterior from a specific
experiment and observed response, use `updatePosterior` rather than AIG, which
accepts the same arguments as `AIG`.

#### Returns
`updatePosterior` returns an object with two properties:

- **mPosterior**: `Marginal({ ... })`. The updated model distribution.
- **AIG**: `number`. AIG observed from the experiment, as above.

Notice that `AIG` just calls `updatePosterior` and returns only its `AIG`
property. Thus, if you plan on using both `AIG` and `updatePosterior`, use only
`updatePosterior` to save computation time.

### getBestExpt

#### Usage
`getBestExpt` accepts an array of experiments with `x` and `EIG` properties,
such as one returned from the support of an `OED` call.

```javascript
var bestExpt = getBestExpt(eigDist.support());
```

#### Returns
The best experiment, i.e. the one with the highest `EIG`, breaking ties
arbitrarily.

## Examples

`examples/coin.wppl` is a good, approachable introduction to the methods
defined in this package. It sets up the sequence prediction problem introduced
in the original OED paper. To get the best experiment for 3-way comparison,
uncomment the `EIG` call in the last lines of the example.

```sh
webppl examples/coin.wppl --require .
```
