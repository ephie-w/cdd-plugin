---
name: assess-tracing
description: Use when an AI service needs distributed traces routed to a Braintrust project and is considering the shared OTel pipeline.
---

# Assess tracing fit

This demo skill evaluates fit only. Do not connect to Braintrust or change telemetry configuration.

Confirm the request is for traces, not OTel Metrics or a live metrics dashboard. Confirm a Braintrust routing project identifier is available. If either condition fails, do not recommend this pipeline as the solution. Report the pipeline as a `candidate`, not an approved component. For real implementation, consult its current onboarding runbook and owner.
