# Official text the AI reads

Each `.txt` file here is a passage copied by hand from an official page (the law on
law.cornell.edu or congress.gov, an IRS notice or revenue procedure, an FTB or EDD page).
`api/scripts/propose_rule_update.py` reads one of these files and proposes rule changes,
quoting the exact sentence it relied on. Plain code checks that the sentence is really in
the file before anything is proposed.

Copy only the passage that matters, as written. Don't edit or summarize it, or the quote
check will (rightly) fail. Name files after their source, like `obbba_70433.txt`.
