"""
Realistic ADAS sensor test data generator for the Magna ADAS Test Agent demo.

Generates test records that reflect Magna's real ADAS sensor fusion work:
  - Camera + radar early fusion (for AEB, FCW)
  - Thermal + Doppler radar fusion (night/adverse weather)
  - LiDAR for long-range perception

Data relationships are domain-coherent:
  - Cameras degrade in rain/fog/snow/night; thermal excels at night.
  - Radar penetrates rain better than optical sensors.
  - LiDAR degrades in heavy snow/fog (particle scattering).
  - Long-range thermal detection is physically limited.

Output is deterministic (random.seed(42)) for reproducible demos and tests.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from typing import Any

# ---------------------------------------------------------------------------
# Domain constants
# ---------------------------------------------------------------------------

SENSOR_TYPES = ["camera", "radar", "thermal", "lidar"]
SENSOR_WEIGHTS = [0.40, 0.25, 0.20, 0.15]  # matches CLAUDE.md distribution

FEATURES = ["AEB", "FCW", "LCA", "BSD", "ACC", "TSR"]

# Sensor → compatible features (features that sensor type supports)
# This inverts the dependency: we sample sensor first (preserves distribution),
# then pick a compatible feature, reflecting Magna's sensor-fusion matrix.
SENSOR_FEATURE_COMPATIBILITY: dict[str, list[str]] = {
    "camera":  ["AEB", "FCW", "LCA", "TSR"],         # vision-heavy features
    "radar":   ["AEB", "FCW", "LCA", "BSD", "ACC"],  # fusion + blind-spot + ranging
    "thermal": ["AEB", "FCW"],                        # night/adverse-weather front detect
    "lidar":   ["AEB", "FCW", "ACC"],                 # long-range ranging
}

VEHICLE_MODELS = ["SUV-X1", "Sedan-M3", "Truck-T7"]
VEHICLE_WEIGHTS = [0.45, 0.35, 0.20]

FIRMWARE_VERSIONS = [
    "v4.0.3", "v4.0.7",
    "v4.1.0", "v4.1.2", "v4.1.5",
    "v4.2.0", "v4.2.1", "v4.2.3", "v4.2.4",
    "v4.3.0", "v4.3.1",
]
FIRMWARE_WEIGHTS = [
    0.02, 0.03,
    0.05, 0.07, 0.08,
    0.10, 0.14, 0.12, 0.10,
    0.15, 0.14,
]

WEATHER = ["clear", "rain", "heavy rain", "snow", "fog", "dense fog"]
WEATHER_WEIGHTS = [0.50, 0.18, 0.08, 0.08, 0.10, 0.06]

TIME_OF_DAY = ["day", "dusk", "night", "dawn"]
TIME_WEIGHTS = [0.55, 0.12, 0.25, 0.08]

SUBJECTS = ["pedestrian", "vehicle", "cyclist", "animal", "motorcycle", "stationary object"]
SUBJECT_WEIGHTS = [0.28, 0.30, 0.12, 0.06, 0.10, 0.14]

ENVIRONMENTS = ["urban", "highway", "intersection", "parking lot", "rural road", "tunnel"]
ENV_WEIGHTS = [0.30, 0.25, 0.18, 0.08, 0.14, 0.05]

# Per-sensor detection-distance operating range (meters)
SENSOR_RANGE: dict[str, tuple[float, float]] = {
    "camera":  (20.0, 120.0),
    "radar":   (30.0, 150.0),
    "thermal": (15.0,  90.0),
    "lidar":   (40.0, 150.0),
}

# Per-sensor baseline execution time (ms)
SENSOR_EXEC_MS: dict[str, tuple[int, int]] = {
    "camera":  (80,  1200),
    "radar":   (50,   800),
    "thermal": (150, 2500),
    "lidar":   (300, 5000),
}

# ---------------------------------------------------------------------------
# Domain-coherent failure-rate modifiers
# ---------------------------------------------------------------------------

BASE_FAIL_P = 0.095
BASE_WARN_P = 0.048


def compute_outcome_probs(sensor: str, weather: str, time_of_day: str,
                          env: str, distance_m: float) -> tuple[float, float]:
    """Return (fail_p, warn_p) conditioned on the scenario. pass_p = 1 - both."""
    fail_mult = 1.0
    warn_mult = 1.0

    # Weather effects
    if sensor == "camera":
        if weather in ("rain", "snow", "fog"):
            fail_mult *= 2.2
            warn_mult *= 1.6
        elif weather in ("heavy rain", "dense fog"):
            fail_mult *= 3.0
            warn_mult *= 2.0
    elif sensor == "thermal":
        # Thermal tolerates fog/night well, but heavy rain still degrades it
        if weather in ("heavy rain",):
            fail_mult *= 1.5
        elif weather in ("dense fog", "fog"):
            fail_mult *= 0.8  # thermal actually helps here
    elif sensor == "radar":
        # Radar is robust to rain/fog
        if weather in ("rain", "heavy rain", "fog", "dense fog"):
            fail_mult *= 0.85
        if weather == "snow":
            fail_mult *= 1.2  # wet snow can attenuate
    elif sensor == "lidar":
        if weather in ("snow", "dense fog"):
            fail_mult *= 2.4  # particle scattering
            warn_mult *= 1.8
        elif weather in ("fog", "heavy rain"):
            fail_mult *= 1.6

    # Time-of-day effects
    if sensor == "camera":
        if time_of_day == "night":
            fail_mult *= 1.8
            warn_mult *= 1.4
        elif time_of_day in ("dusk", "dawn"):
            fail_mult *= 1.3
    elif sensor == "thermal":
        if time_of_day == "night":
            fail_mult *= 0.6  # thermal shines at night
        elif time_of_day == "day":
            fail_mult *= 1.15  # warm backgrounds cause confusion

    # Long-range thermal struggles
    if sensor == "thermal" and distance_m > 70.0:
        fail_mult *= 1.6

    # Urban clutter bumps false-positive-driven warnings for camera/radar
    if env == "urban" and sensor in ("camera", "radar"):
        warn_mult *= 1.3

    # Tunnel is hard on camera (sudden light changes)
    if env == "tunnel" and sensor == "camera":
        fail_mult *= 1.5

    fail_p = min(BASE_FAIL_P * fail_mult, 0.65)
    warn_p = min(BASE_WARN_P * warn_mult, 0.25)
    # Ensure pass_p stays positive
    if fail_p + warn_p > 0.92:
        scale = 0.92 / (fail_p + warn_p)
        fail_p *= scale
        warn_p *= scale
    return fail_p, warn_p


# ---------------------------------------------------------------------------
# Notes bank — scenario-appropriate engineering comments
# ---------------------------------------------------------------------------

FAIL_NOTES_TEMPLATES: dict[str, list[str]] = {
    "camera": [
        "Missed detection at {dist}m in {weather}",
        "Lens flare caused false negative during {tod}",
        "Low contrast edge case — subject blended with background",
        "Detection latency exceeded 500ms budget",
        "Classifier confidence collapsed below 0.3 threshold",
    ],
    "radar": [
        "Multipath reflection off guardrail triggered false positive",
        "Doppler ambiguity at {dist}m closing speed",
        "Ground clutter masked low-RCS target",
        "Cross-traffic filter rejected valid target",
    ],
    "thermal": [
        "Thermal crossover — subject temperature matched ambient",
        "Range-limited detection at {dist}m in {weather}",
        "Sensor calibration drift detected during session",
        "Warm asphalt baseline caused false positive",
    ],
    "lidar": [
        "Point-cloud sparsity at {dist}m degraded classification",
        "Snow particle returns saturated near-field channels",
        "Rolling shutter artifact on fast-moving {subject}",
        "Ego-motion compensation failed during lane change",
    ],
}

WARN_NOTES_TEMPLATES: dict[str, list[str]] = {
    "camera": [
        "Detection confidence dipped to {conf:.2f} — within tolerance",
        "Bounding box jitter observed but track maintained",
        "Minor latency spike during frame {frame}",
    ],
    "radar": [
        "Track fragmentation at {dist}m — reacquired in 2 frames",
        "Slight range-rate drift during merge maneuver",
        "Signal-to-noise margin reduced by {pct}% vs baseline",
    ],
    "thermal": [
        "Emissivity variance flagged; detection still nominal",
        "Minor thermal gradient artifact in bottom-left quadrant",
    ],
    "lidar": [
        "Point density {pct}% below target but classification held",
        "Minor occlusion event — track maintained via fusion",
    ],
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _weighted_choice(choices: list[str], weights: list[float]) -> str:
    return random.choices(choices, weights=weights, k=1)[0]


def _choose_feature_for_sensor(sensor: str) -> str:
    """Pick a feature from the sensor's compatible set.

    Sensor is sampled first (preserving the target sensor distribution), then
    a feature is drawn from the sensor-compatibility map. For features in
    multiple sensor buckets, usage is naturally proportional to how many
    sensors support them — mirroring real ADAS fusion testing.
    """
    return random.choice(SENSOR_FEATURE_COMPATIBILITY[sensor])


def _build_scenario(subject: str, weather: str, time_of_day: str, env: str) -> tuple[str, list[str]]:
    """Render a human-readable scenario string + tag list."""
    # Natural prose assembly
    subject_verb = {
        "pedestrian": "Pedestrian crossing",
        "vehicle": "Vehicle cut-in",
        "cyclist": "Cyclist merging",
        "animal": "Animal on roadway",
        "motorcycle": "Motorcycle lane-split",
        "stationary object": "Stationary object ahead",
    }[subject]

    env_prose = {
        "urban": "urban street",
        "highway": "highway",
        "intersection": "intersection",
        "parking lot": "parking lot",
        "rural road": "rural road",
        "tunnel": "tunnel",
    }[env]

    scenario = f"{subject_verb}, {weather}, {time_of_day}, {env_prose}"

    # Tag list (normalized lowercase tokens for filtering)
    tags = [
        subject.replace(" ", "_"),
        weather.replace(" ", "_"),
        time_of_day,
        env.replace(" ", "_"),
    ]
    return scenario, tags


def _sample_detection_distance(sensor: str, weather: str, time_of_day: str) -> float:
    lo, hi = SENSOR_RANGE[sensor]
    # Sample from a triangular distribution skewed toward mid-range
    mid = lo + (hi - lo) * 0.55
    dist = random.triangular(lo, hi, mid)
    # Degrade effective range for adverse conditions
    if sensor == "camera" and (weather in ("heavy rain", "dense fog") or time_of_day == "night"):
        dist *= random.uniform(0.55, 0.85)
    if sensor == "thermal" and weather in ("heavy rain",):
        dist *= random.uniform(0.7, 0.9)
    if sensor == "lidar" and weather in ("snow", "dense fog"):
        dist *= random.uniform(0.6, 0.85)
    return round(max(lo, dist), 1)


def _sample_confidence(result: str, sensor: str, weather: str, time_of_day: str) -> float:
    if result == "pass":
        base = random.uniform(0.82, 0.99)
    elif result == "warning":
        base = random.uniform(0.55, 0.78)
    else:  # fail
        base = random.uniform(0.15, 0.48)
    # Additional degradation for hard conditions on optical sensors
    if sensor == "camera" and (weather in ("heavy rain", "dense fog") or time_of_day == "night"):
        base = max(0.05, base - random.uniform(0.05, 0.12))
    return round(base, 3)


def _sample_fp_rate(sensor: str, env: str, result: str) -> float:
    base = {
        "camera":  random.uniform(0.008, 0.030),
        "radar":   random.uniform(0.002, 0.015),
        "thermal": random.uniform(0.006, 0.022),
        "lidar":   random.uniform(0.004, 0.018),
    }[sensor]
    if env == "urban" and sensor in ("camera", "radar"):
        base *= random.uniform(1.2, 1.8)
    if result == "fail":
        base *= random.uniform(1.1, 2.2)
    return round(min(base, 0.05), 4)


def _sample_exec_time(sensor: str, result: str) -> int:
    lo, hi = SENSOR_EXEC_MS[sensor]
    mid = lo + (hi - lo) * 0.4
    t = random.triangular(lo, hi, mid)
    if result == "fail":
        t *= random.uniform(1.0, 1.5)
    return int(min(t, 5000))


def _sample_timestamp(now: datetime) -> datetime:
    """Random timestamp in last 90 days, biased slightly toward recent days."""
    days_back = int(random.triangular(0, 90, 30))
    seconds_of_day = random.randint(0, 86399)
    ts = now - timedelta(days=days_back)
    ts = ts.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(seconds=seconds_of_day)
    return ts


def _build_note(result: str, sensor: str, scenario_ctx: dict[str, Any]) -> str | None:
    if result == "pass":
        return None
    templates = FAIL_NOTES_TEMPLATES[sensor] if result == "fail" else WARN_NOTES_TEMPLATES[sensor]
    template = random.choice(templates)
    return template.format(
        dist=int(scenario_ctx["distance_m"]),
        weather=scenario_ctx["weather"],
        tod=scenario_ctx["time_of_day"],
        subject=scenario_ctx["subject"],
        conf=scenario_ctx["confidence"],
        frame=random.randint(120, 9800),
        pct=random.randint(5, 22),
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def generate_test_records(count: int = 550,
                          reference_date: datetime | None = None) -> list[dict]:
    """
    Generate `count` realistic ADAS test records.

    Uses random.seed(42) so output is deterministic across runs — important
    for reproducible demos, screenshots, and tests.
    """
    random.seed(42)
    now = reference_date or datetime(2026, 4, 4, 12, 0, 0, tzinfo=timezone.utc)

    records: list[dict] = []
    for i in range(1, count + 1):
        sensor = _weighted_choice(SENSOR_TYPES, SENSOR_WEIGHTS)
        feature = _choose_feature_for_sensor(sensor)

        weather = _weighted_choice(WEATHER, WEATHER_WEIGHTS)
        time_of_day = _weighted_choice(TIME_OF_DAY, TIME_WEIGHTS)
        subject = _weighted_choice(SUBJECTS, SUBJECT_WEIGHTS)
        env = _weighted_choice(ENVIRONMENTS, ENV_WEIGHTS)

        scenario, tags = _build_scenario(subject, weather, time_of_day, env)
        distance_m = _sample_detection_distance(sensor, weather, time_of_day)

        fail_p, warn_p = compute_outcome_probs(sensor, weather, time_of_day, env, distance_m)
        roll = random.random()
        if roll < fail_p:
            result = "fail"
        elif roll < fail_p + warn_p:
            result = "warning"
        else:
            result = "pass"

        confidence = _sample_confidence(result, sensor, weather, time_of_day)
        fp_rate = _sample_fp_rate(sensor, env, result)
        exec_ms = _sample_exec_time(sensor, result)
        ts = _sample_timestamp(now)

        vehicle = _weighted_choice(VEHICLE_MODELS, VEHICLE_WEIGHTS)
        firmware = _weighted_choice(FIRMWARE_VERSIONS, FIRMWARE_WEIGHTS)

        scenario_ctx = {
            "distance_m": distance_m,
            "weather": weather,
            "time_of_day": time_of_day,
            "subject": subject,
            "confidence": confidence,
        }
        notes = _build_note(result, sensor, scenario_ctx) or ""

        records.append({
            "test_id": f"TC-2026-{i:05d}",
            "sensor_type": sensor,
            "scenario": scenario,
            "scenario_tags": tags,
            "feature": feature,
            "result": result,
            "confidence_score": confidence,
            "detection_distance_m": distance_m,
            "false_positive_rate": fp_rate,
            "execution_time_ms": exec_ms,
            "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "vehicle_model": vehicle,
            "firmware_version": firmware,
            "notes": notes,
        })

    return records


if __name__ == "__main__":
    # Quick diagnostic when run directly
    rows = generate_test_records()
    from collections import Counter
    print(f"Generated {len(rows)} records")
    print("Result distribution:", Counter(r["result"] for r in rows))
    print("Sensor distribution:", Counter(r["sensor_type"] for r in rows))
    print("Feature distribution:", Counter(r["feature"] for r in rows))
    print("Example:", rows[0])
