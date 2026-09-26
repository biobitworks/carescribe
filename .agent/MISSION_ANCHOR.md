# CareScribe mission anchor

CareScribe is a caregiver-controlled pediatric healthcare advocate prototype.

The hackathon build may demonstrate authorized encounter capture, descriptive
observations, evidence-linked questions, caregiver corrections, provider review, and
append-only local FCO/FCG/MMR custody using synthetic data.

The claim ceiling is a prototype workflow demonstration only. CareScribe is not
clinically validated, does not diagnose or prescribe, and does not replace a clinician.
Amazon Bedrock is remote inference and must never be described as local. Canonical
session state and custody records remain locally controlled in the demonstrated design.

The live loop is:

`OBSERVE → ATOMIZE → LINK → REMIND → CONFIRM → APPEND`
