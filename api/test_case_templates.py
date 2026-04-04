"""
Template bank for generating structured ADAS test cases from a requirement.

Generation is deterministic (seeded by hash of the requirement string) so the
same requirement always produces the same test cases — important for demo
reproducibility. The template matrix draws on the same domain vocabulary as
`mock_data.py` (weather, time-of-day, subjects) so generated cases feel
consistent with the seeded test records the agent also queries.

The confidence score per case reflects template-match quality:
  - high: feature + explicit axis (distance, subject) present in requirement
  - medium: feature present, axes inferred
  - low: feature inferred from fallback
"""

from __future__ import annotations

import random
import re
from typing import Any

# ---------------------------------------------------------------------------
# Scenario axes — drawn from mock_data.py so generated cases share vocabulary
# with seeded test records
# ---------------------------------------------------------------------------

SCENARIO_AXES: dict[str, list[Any]] = {
    "weather": ["clear", "rain", "heavy rain", "fog"],
    "time_of_day": ["day", "dusk", "night"],
    "distance_m": [30, 50, 70, 100, 120],
    "speed_kmh": [30, 50, 70, 90],
    "subject": ["pedestrian", "vehicle", "cyclist", "motorcycle", "stationary object"],
    "environment": ["urban street", "highway", "intersection", "rural road"],
}

# ---------------------------------------------------------------------------
# Per-feature template bank
#
# Each template is a dict with placeholders that get filled from the axis
# values. The `axes` field lists which axes this template varies on.
# ---------------------------------------------------------------------------

TEMPLATES: dict[str, list[dict]] = {
    "AEB": [
        {
            "title": "AEB — {subject} detection at {distance_m}m, {weather}, {time_of_day}",
            "preconditions": [
                "Ego vehicle approaching {subject} at {distance_m}m range",
                "Ego speed: {speed_kmh} km/h",
                "Weather: {weather}; illumination: {time_of_day}",
                "Pavement: dry asphalt (standard friction coefficient)",
            ],
            "steps": [
                "Position {subject} at {distance_m}m down-road from ego vehicle",
                "Accelerate ego to {speed_kmh} km/h and maintain steady velocity",
                "Log time-to-first-detection and time-to-brake-engagement",
                "Measure minimum stopping distance relative to target",
            ],
            "expected_result": "AEB engages autonomously before collision; ego decelerates and stops >= 1m short of {subject}.",
            "pass_criteria": "Detection distance >= {min_detect}m AND brake-engagement latency <= 250ms AND no contact with target.",
            "priority": "high",
            "estimated_duration_min": 20,
            "axes": ["subject", "distance_m", "speed_kmh", "weather", "time_of_day"],
        },
        {
            "title": "AEB — False-positive suppression on roadside {subject}",
            "preconditions": [
                "Ego traveling {speed_kmh} km/h on {environment}",
                "{subject} stationary 2m off roadway shoulder",
                "Clear line of sight, {weather} conditions",
            ],
            "steps": [
                "Approach stationary roadside target at {speed_kmh} km/h",
                "Verify AEB does NOT engage as target stays clear of ego's path",
                "Capture sensor fusion trace at the moment of closest approach",
            ],
            "expected_result": "AEB remains idle; no autonomous brake event triggered.",
            "pass_criteria": "False-positive rate <= 0.001 AND no brake engagement during pass-by.",
            "priority": "high",
            "estimated_duration_min": 15,
            "axes": ["subject", "speed_kmh", "weather", "environment"],
        },
        {
            "title": "AEB — {subject} cut-in at {distance_m}m, {environment}",
            "preconditions": [
                "Ego traveling {speed_kmh} km/h in leftmost lane",
                "{subject} cuts in from adjacent lane at {distance_m}m ahead",
                "{environment} environment",
            ],
            "steps": [
                "Maintain ego at {speed_kmh} km/h",
                "Trigger {subject} lateral maneuver into ego lane at {distance_m}m",
                "Record sensor handoff timing and brake-command latency",
            ],
            "expected_result": "AEB classifies cut-in as imminent threat and initiates graduated braking within 300ms.",
            "pass_criteria": "Threat classification within 2 frames AND brake latency <= 300ms AND final gap >= 2m.",
            "priority": "high",
            "estimated_duration_min": 25,
            "axes": ["subject", "distance_m", "speed_kmh", "environment"],
        },
    ],
    "FCW": [
        {
            "title": "FCW — Warning issued for {subject} at {distance_m}m closing rate",
            "preconditions": [
                "Ego approaching {subject} at {speed_kmh} km/h",
                "Range to target: {distance_m}m",
                "{weather}, {time_of_day}",
            ],
            "steps": [
                "Establish closing trajectory toward {subject}",
                "Monitor audible + visual warning activation threshold",
                "Record time-to-collision at moment of warning",
            ],
            "expected_result": "FCW issues warning at TTC <= 2.5s with audible chirp + dashboard alert.",
            "pass_criteria": "Warning fires between 2.0s and 2.8s TTC; no false positives in preceding 30s window.",
            "priority": "high",
            "estimated_duration_min": 12,
            "axes": ["subject", "distance_m", "speed_kmh", "weather", "time_of_day"],
        },
        {
            "title": "FCW — Degraded-visibility warning ({weather}, {time_of_day})",
            "preconditions": [
                "Reduced sensor confidence expected in {weather}",
                "{time_of_day} illumination",
                "Target {subject} at {distance_m}m",
            ],
            "steps": [
                "Approach target under degraded optical conditions",
                "Verify FCW still issues warning within nominal TTC window",
                "Inspect sensor-fusion confidence output",
            ],
            "expected_result": "Warning fires despite degraded visibility; fusion confidence >= 0.6.",
            "pass_criteria": "TTC at warning within [2.0s, 3.0s] AND fusion confidence >= 0.6 AND no suppression.",
            "priority": "medium",
            "estimated_duration_min": 18,
            "axes": ["weather", "time_of_day", "subject", "distance_m"],
        },
        {
            "title": "FCW — Warning suppression during ACC-managed approach",
            "preconditions": [
                "ACC active and managing gap to lead vehicle",
                "Ego speed: {speed_kmh} km/h; gap: {distance_m}m",
            ],
            "steps": [
                "Engage ACC with target following",
                "Reduce lead-vehicle speed gradually",
                "Verify FCW remains silent while ACC manages deceleration",
            ],
            "expected_result": "FCW suppressed; ACC brake-command takes precedence without driver alert.",
            "pass_criteria": "No FCW activation during controlled ACC deceleration phase.",
            "priority": "medium",
            "estimated_duration_min": 15,
            "axes": ["speed_kmh", "distance_m"],
        },
    ],
    "LCA": [
        {
            "title": "LCA — Adjacent-lane {subject} detection during lane change",
            "preconditions": [
                "Ego traveling {speed_kmh} km/h on {environment}",
                "{subject} in adjacent lane, {distance_m}m behind",
                "Driver activates turn signal",
            ],
            "steps": [
                "Activate turn signal toward adjacent lane",
                "Verify LCA alert fires when {subject} is within threat envelope",
                "Measure alert latency from signal activation",
            ],
            "expected_result": "LCA warning triggers within 400ms of signal activation when target is in envelope.",
            "pass_criteria": "Alert latency <= 400ms AND no missed detection across 20 trials.",
            "priority": "high",
            "estimated_duration_min": 20,
            "axes": ["subject", "distance_m", "speed_kmh", "environment"],
        },
        {
            "title": "LCA — No-warning correctness check (clear adjacent lane)",
            "preconditions": [
                "Adjacent lane fully clear of traffic",
                "Ego speed {speed_kmh} km/h",
            ],
            "steps": [
                "Activate turn signal",
                "Perform lane change maneuver",
                "Verify no LCA alert issued",
            ],
            "expected_result": "No warning issued; lane change completes uneventfully.",
            "pass_criteria": "Zero false-positive LCA alerts across 10 trials.",
            "priority": "medium",
            "estimated_duration_min": 10,
            "axes": ["speed_kmh"],
        },
    ],
    "BSD": [
        {
            "title": "BSD — {subject} in blind spot at {speed_kmh} km/h",
            "preconditions": [
                "{subject} present in ego's adjacent-lane blind-spot zone",
                "Ego speed {speed_kmh} km/h on {environment}",
            ],
            "steps": [
                "Place {subject} in blind-spot envelope for >= 2 seconds",
                "Verify mirror-indicator illumination activates",
                "Log indicator-on-time until target exits zone",
            ],
            "expected_result": "Mirror indicator activates within 500ms of target entering zone and deactivates within 500ms of exit.",
            "pass_criteria": "Activation + deactivation latency both <= 500ms AND indicator state tracks target continuously.",
            "priority": "high",
            "estimated_duration_min": 12,
            "axes": ["subject", "speed_kmh", "environment"],
        },
        {
            "title": "BSD — Multi-target simultaneous detection",
            "preconditions": [
                "Two {subject}s occupy both left and right blind spots",
                "Ego traveling {speed_kmh} km/h",
            ],
            "steps": [
                "Position targets simultaneously in both blind-spot zones",
                "Verify both mirror indicators activate independently",
            ],
            "expected_result": "Both left and right indicators illuminate and track independently.",
            "pass_criteria": "Both indicators activate within 500ms and remain stable for target dwell time.",
            "priority": "medium",
            "estimated_duration_min": 15,
            "axes": ["subject", "speed_kmh"],
        },
    ],
    "ACC": [
        {
            "title": "ACC — Gap maintenance to lead vehicle at {speed_kmh} km/h",
            "preconditions": [
                "ACC engaged, target gap set to 2.0s",
                "Lead vehicle traveling {speed_kmh} km/h, {distance_m}m ahead",
                "{weather}, {environment}",
            ],
            "steps": [
                "Engage ACC with 2.0s time-gap setting",
                "Monitor ego's dynamic gap adjustment as lead speed varies",
                "Record throttle + brake commands over 2-minute window",
            ],
            "expected_result": "Ego maintains 2.0s +/- 0.2s time-gap across speed fluctuations.",
            "pass_criteria": "Gap stays within tolerance AND no driver intervention required AND no FCW triggered.",
            "priority": "high",
            "estimated_duration_min": 30,
            "axes": ["speed_kmh", "distance_m", "weather", "environment"],
        },
        {
            "title": "ACC — Stop-and-go handling in {environment} traffic",
            "preconditions": [
                "Stop-and-go traffic pattern on {environment}",
                "ACC engaged with lead vehicle present",
            ],
            "steps": [
                "Follow lead vehicle through multiple full-stop cycles",
                "Verify ACC brings ego to complete stop and resumes smoothly",
                "Log jerk profile during resume phase",
            ],
            "expected_result": "ACC manages full-stop and resume without driver input; smooth jerk profile.",
            "pass_criteria": "Resume latency <= 3s from lead movement AND peak jerk <= 2.5 m/s^3.",
            "priority": "medium",
            "estimated_duration_min": 25,
            "axes": ["environment"],
        },
    ],
    "TSR": [
        {
            "title": "TSR — Speed-limit sign recognition at {speed_kmh} km/h, {weather}",
            "preconditions": [
                "Ego approaching posted speed-limit sign at {speed_kmh} km/h",
                "{weather}, {time_of_day}",
                "Sign clean and unobstructed",
            ],
            "steps": [
                "Approach speed-limit sign on {environment}",
                "Verify OCR pipeline classifies sign value correctly",
                "Check HUD update latency from sign-enter-frame to display",
            ],
            "expected_result": "Detected limit appears on HUD within 800ms of sign entering camera frame.",
            "pass_criteria": "OCR accuracy >= 99% across 50 trials AND HUD latency <= 800ms.",
            "priority": "medium",
            "estimated_duration_min": 20,
            "axes": ["speed_kmh", "weather", "time_of_day", "environment"],
        },
        {
            "title": "TSR — Obstructed sign recovery ({weather})",
            "preconditions": [
                "Speed-limit sign partially obstructed by foliage",
                "{weather} conditions, {time_of_day}",
            ],
            "steps": [
                "Approach partially obstructed sign",
                "Observe whether TSR falls back to map-based limit or waits for clear frame",
            ],
            "expected_result": "TSR either reads sign correctly or falls back to map data without showing stale value.",
            "pass_criteria": "No stale-value display; fallback transition within 1s of ambiguity.",
            "priority": "low",
            "estimated_duration_min": 15,
            "axes": ["weather", "time_of_day"],
        },
    ],
}


# ---------------------------------------------------------------------------
# Requirement parsing — pull concrete values out of the text when present
# ---------------------------------------------------------------------------


def _extract_hints(requirement: str) -> dict[str, Any]:
    """Scan a requirement string for concrete axis values (distances, subjects)."""
    q = requirement.lower()
    hints: dict[str, Any] = {}

    # distance: "at 50m", ">=50m", "50 meters"
    m = re.search(r"(\d{2,3})\s*(?:m\b|meters?\b)", q)
    if m:
        hints["distance_m"] = int(m.group(1))

    # speed: "at 50 km/h", "50 kph"
    m = re.search(r"(\d{2,3})\s*(?:km/?h|kph)\b", q)
    if m:
        hints["speed_kmh"] = int(m.group(1))

    # subject
    for subj in SCENARIO_AXES["subject"]:
        if subj in q:
            hints["subject"] = subj
            break

    # weather
    for wx in SCENARIO_AXES["weather"]:
        if wx in q:
            hints["weather"] = wx
            break

    # time_of_day
    for tod in SCENARIO_AXES["time_of_day"]:
        if tod in q:
            hints["time_of_day"] = tod
            break

    return hints


def _fill_axes(
    template_axes: list[str],
    hints: dict[str, Any],
    rng: random.Random,
) -> dict[str, Any]:
    """Return a dict mapping every axis in `template_axes` to a concrete value.

    Hints from the requirement win; missing axes get a deterministic random pick.
    """
    filled: dict[str, Any] = {}
    for axis in template_axes:
        if axis in hints:
            filled[axis] = hints[axis]
        else:
            filled[axis] = rng.choice(SCENARIO_AXES[axis])
    return filled


def _confidence_for(template: dict, hints: dict[str, Any]) -> str:
    """High if requirement mentions subject+distance; medium if one; low otherwise."""
    relevant = set(template["axes"])
    mentioned = relevant & set(hints.keys())
    if len(mentioned) >= 2:
        return "high"
    if len(mentioned) == 1:
        return "medium"
    return "low"


def build_test_cases(requirement: str, feature: str, count: int) -> list[dict]:
    """Build `count` test cases for the given feature, varied across templates."""
    templates = TEMPLATES.get(feature, TEMPLATES["AEB"])
    hints = _extract_hints(requirement)

    # Seed from hash(requirement) for reproducibility across calls
    seed = abs(hash(requirement + feature)) % (2**31)
    rng = random.Random(seed)

    cases: list[dict] = []
    for i in range(count):
        tmpl = templates[i % len(templates)]
        filled = _fill_axes(tmpl["axes"], hints, rng)

        # Minimum-detection-distance pass criterion: 90% of scenario distance
        min_detect = int(filled.get("distance_m", 50) * 0.9)
        format_vars = {**filled, "min_detect": min_detect}

        title = tmpl["title"].format(**format_vars)
        preconditions = [p.format(**format_vars) for p in tmpl["preconditions"]]
        steps = [s.format(**format_vars) for s in tmpl["steps"]]
        expected = tmpl["expected_result"].format(**format_vars)
        pass_criteria = tmpl["pass_criteria"].format(**format_vars)

        confidence = _confidence_for(tmpl, hints)
        rationale_parts = []
        if hints:
            matched = [k for k in tmpl["axes"] if k in hints]
            if matched:
                rationale_parts.append(f"matched axes: {', '.join(matched)}")
        if not rationale_parts:
            rationale_parts.append("axes inferred from template defaults")
        rationale = "; ".join(rationale_parts)

        cases.append({
            "test_id": f"TC-GEN-{feature}-{i + 1:03d}",
            "title": title,
            "preconditions": preconditions,
            "steps": steps,
            "expected_result": expected,
            "pass_criteria": pass_criteria,
            "priority": tmpl["priority"],
            "estimated_duration_min": tmpl["estimated_duration_min"],
            "confidence": confidence,
            "rationale": rationale,
        })

    return cases
