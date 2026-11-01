# Task: Multi-Hour Event with Rowspan

## Overview
Support multi-hour events with rowspan display in the calendar grid.

## Status
- **Priority**: Medium
- **Status**: Pending

## Description
Events spanning multiple hours should visually connect using a unified block (rowspan-like) instead of being split into separate cells per hour slot.

## Requirements
- Visual continuity for events crossing multiple time slots
- Single event block for the entire duration
- Clear display of start/end times within the event tile

## Implementation Notes
The current implementation already supports this via absolute positioning:
- Events are positioned using `top` and `height` percentages
- Overlapping events are arranged in columns using bin packing

This task may involve refinement or optimization of the existing positioning system.
