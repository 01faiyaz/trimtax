"""Everything the Overview tab shows, in one call."""

from engine.clock import tax_year_clock, upcoming_deadlines
from engine.contractors import contractor_watch
from engine.equipment import california_room, federal_equipment
from engine.meals import meals_summary
from engine.research import research_summary
from engine.review import flagged_documents, open_items, receipts_filed


def overview(workspace, ruleset, as_of):
    return {
        "company": workspace.company.name,
        "as_of": as_of,
        "ruleset_version": ruleset.version,
        "clock": tax_year_clock(as_of, ruleset),
        "deadlines": upcoming_deadlines(as_of, ruleset),
        "california_equipment": california_room(workspace.transactions, ruleset, workspace.company),
        "federal_equipment": federal_equipment(workspace.transactions, ruleset),
        "contractors": contractor_watch(workspace.transactions, workspace.contractors, ruleset),
        "meals": meals_summary(workspace.transactions, ruleset),
        "research": research_summary(workspace.transactions, ruleset),
        "open_items": open_items(workspace, ruleset),
        "flagged": flagged_documents(workspace),
        "receipts_filed": receipts_filed(workspace, as_of),
    }
