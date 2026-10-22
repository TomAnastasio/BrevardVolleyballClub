import { describe, expect, it } from "vitest";
import { matchDivision, matchToProfiles, parseRoster } from "./rosterImport.js";

describe("parseRoster", () => {
  it("reads tab-separated text pasted from Google Sheets, ignoring date of birth", () => {
    const text = [
      "Timestamp\tEmail\tFirst name\tLast name\tCell phone\tDate of birth\tDivision",
      "10/20/2026\tJane@x.com\tJane\tDoe\t321-555-0100\t01/02/1990\tWomen's Open",
      "10/21/2026\tsam@x.com\tSam\tLee\t321-555-0101\t03/04/1995\tWomen's A",
    ].join("\n");
    const { players, error } = parseRoster(text);
    expect(error).toBe("");
    expect(players).toEqual([
      { name: "Jane Doe", email: "jane@x.com", phone: "321-555-0100", division: "Women's Open" },
      { name: "Sam Lee", email: "sam@x.com", phone: "321-555-0101", division: "Women's A" },
    ]);
    expect(JSON.stringify(players)).not.toContain("1990");
  });

  it("reads a downloaded CSV with quoted fields", () => {
    const text = 'First name,Last name,Division\r\n"Mary, Jr.",Smith,"Women\'s AA"\r\n';
    expect(parseRoster(text).players).toEqual([
      { name: "Mary, Jr. Smith", email: "", phone: "", division: "Women's AA" },
    ]);
  });

  it("keeps only the latest submission from the same email", () => {
    const text = "Email,First name,Last name,Division\na@x.com,Ann,B,Women's A\nA@x.com,Ann,B,Women's AA";
    expect(parseRoster(text).players).toEqual([{ name: "Ann B", email: "a@x.com", phone: "", division: "Women's AA" }]);
  });

  it("explains a missing name column", () => {
    expect(parseRoster("Email,Division\na@x.com,A").error).toMatch(/First name/);
  });
});

describe("matchToProfiles", () => {
  const profiles = [
    { id: "1", display_name: "Jane Doe" },
    { id: "2", display_name: "Janet Dough" },
    { id: "3", display_name: "Renée Smith" },
  ];

  it("pre-selects an exact name match, ignoring case and accents", () => {
    const [jane, renee] = matchToProfiles([{ name: "jane doe" }, { name: "Renee Smith" }], profiles);
    expect(jane.profileId).toBe("1");
    expect(renee.profileId).toBe("3");
  });

  it("offers suggestions but defaults to a new profile when unsure", () => {
    const [row] = matchToProfiles([{ name: "Jan Doe" }], profiles);
    expect(row.profileId).toBeNull();
    expect(row.suggestions.map((s) => s.id)).toContain("1");
  });
});

describe("matchDivision", () => {
  const divisions = [
    { id: "open", name: "Women's Open" },
    { id: "aa", name: "Women's AA" },
    { id: "a", name: "Women's A" },
  ];
  it("matches exact and decorated division names without confusing A and AA", () => {
    expect(matchDivision("Women's AA", divisions)).toBe("aa");
    expect(matchDivision("Women's A - $20", divisions)).toBe("a");
    expect(matchDivision("Women's AA ($30)", divisions)).toBe("aa");
    expect(matchDivision("Men's", divisions)).toBeNull();
  });
});
