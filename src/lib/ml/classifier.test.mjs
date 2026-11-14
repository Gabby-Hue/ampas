import test from "node:test";
import assert from "node:assert/strict";
import { predictAdhdRisk, getPretrainedModel, trainLogisticRegression } from "./classifier.ts";
import { generateLabeledDataset } from "./synthetic.ts";

test("predictAdhdRisk mengklasifikasikan profil neurotypical dengan benar (probabilitas rendah)", () => {
  const model = getPretrainedModel();
  const ntProfile = {
    commission_rate: 0.05,
    omission_rate: 0.04,
    median_rt_ms: 450,
    rt_variability_ms: 55,
    d_prime: 2.2,
    fatigue_slope: -0.01,
    tau_ms: 18,
    asrs_score: 3,
  };

  const result = predictAdhdRisk(ntProfile, model);
  assert.equal(result.classification, "nt");
  assert.ok(result.probability < 0.4, `Expected probability < 0.4, got ${result.probability}`);
});

test("predictAdhdRisk mengklasifikasikan profil ADHD-pattern dengan benar (probabilitas tinggi)", () => {
  const model = getPretrainedModel();
  const adhdProfile = {
    commission_rate: 0.28,
    omission_rate: 0.16,
    median_rt_ms: 360,
    rt_variability_ms: 125,
    d_prime: 1.1,
    fatigue_slope: -0.07,
    tau_ms: 52,
    asrs_score: 14,
  };

  const result = predictAdhdRisk(adhdProfile, model);
  assert.equal(result.classification, "adhd");
  assert.ok(result.probability > 0.6, `Expected probability > 0.6, got ${result.probability}`);
});

test("trainLogisticRegression melatih dataset sintetis dengan akurasi tinggi", () => {
  const dataset = generateLabeledDataset(60, 1234);
  const trained = trainLogisticRegression(dataset, 400);
  assert.ok(trained.accuracy >= 0.85, `Expected accuracy >= 0.85, got ${trained.accuracy}`);
  assert.equal(trained.weights.length, 8);
  assert.ok(Number.isFinite(trained.bias));
});
