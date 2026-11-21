"""Core modules for the combined error-mitigation stack."""

from .adaptive_conservation import (
    AdaptiveResult,
    NoiseConfig,
    build_noise_model,
    build_confusion_matrix,
    mitigate_readout,
    hard_postselect_fraction,
    adaptive_correctness_estimate,
    run_adaptive_conservation,
)
from .scorecard import ScorecardRow, build_scorecard, print_scorecard
from .budget_meter import MethodCost, build_budget_meter, print_budget_meter
from .stand_ins import get_stand_in, STAND_INS

__all__ = [
    "AdaptiveResult",
    "NoiseConfig",
    "build_noise_model",
    "build_confusion_matrix",
    "mitigate_readout",
    "hard_postselect_fraction",
    "adaptive_correctness_estimate",
    "run_adaptive_conservation",
    "ScorecardRow",
    "build_scorecard",
    "print_scorecard",
    "MethodCost",
    "build_budget_meter",
    "print_budget_meter",
    "get_stand_in",
    "STAND_INS",
]
