import assert from "node:assert/strict";
import {
  cleanCompanyForMatch,
  getCompanyInitials,
  findBestMatchingCompany,
} from "../src/lib/jobId.ts";

console.log("Testing company matcher...");

// 1. Acronym extraction
assert.equal(getCompanyInitials("Canadian Imperial Bank of Commerce"), "cibc");
assert.equal(getCompanyInitials("Royal Bank of Canada"), "rbc");
assert.equal(getCompanyInitials("Amazon Web Services"), "aws");
assert.equal(getCompanyInitials("International Business Machines"), "ibm");
assert.equal(getCompanyInitials("Ontario Teachers' Pension Plan"), "otpp");

// 2. Clean company for matching
assert.equal(cleanCompanyForMatch("Example Recruiting"), "example");
assert.equal(cleanCompanyForMatch("Example Ltd."), "example");
assert.equal(cleanCompanyForMatch("Example, Inc."), "example");
assert.equal(cleanCompanyForMatch("Example Technologies"), "example");
assert.equal(cleanCompanyForMatch("Example Solutions"), "example");
assert.equal(cleanCompanyForMatch("Example Careers"), "example");
assert.equal(cleanCompanyForMatch("CIBC Bank"), "cibc");

// 3. User past applications matching
const userHistory = [
  { company: "CIBC" },
  { company: "CIBC" },
  { company: "Example" },
  { company: "Royal Bank of Canada" }, // User prefers full name here
  { company: "TD" },
  { company: "Shopify" },
];

// Test A: Scraped full name -> User has shorthand "CIBC"
assert.equal(
  findBestMatchingCompany("Canadian Imperial Bank of Commerce", userHistory),
  "CIBC"
);
assert.equal(
  findBestMatchingCompany("CIBC World Markets", userHistory),
  "CIBC"
);
assert.equal(
  findBestMatchingCompany("CIBC Capital Markets", userHistory),
  "CIBC"
);

// Test B: Scraped with extra corporate/recruiting noise -> User has "Example"
assert.equal(
  findBestMatchingCompany("Example Recruiting", userHistory),
  "Example"
);
assert.equal(
  findBestMatchingCompany("Example Ltd", userHistory),
  "Example"
);
assert.equal(
  findBestMatchingCompany("Example Inc.", userHistory),
  "Example"
);
assert.equal(
  findBestMatchingCompany("Example Technologies", userHistory),
  "Example"
);
assert.equal(
  findBestMatchingCompany("Example Careers", userHistory),
  "Example"
);
assert.equal(
  findBestMatchingCompany("Example Digital Services", userHistory),
  "Example"
);

// Test C: User prefers full name "Royal Bank of Canada" -> Scraped is "RBC"
assert.equal(
  findBestMatchingCompany("RBC", userHistory),
  "Royal Bank of Canada"
);
assert.equal(
  findBestMatchingCompany("RBC Royal Bank", userHistory),
  "Royal Bank of Canada"
);

// Test D: Scraped has parenthetical acronym
assert.equal(
  findBestMatchingCompany("Canadian Imperial Bank of Commerce (CIBC)", userHistory),
  "CIBC"
);

// Test E: Sub-brand prefix match -> User has "Shopify"
assert.equal(
  findBestMatchingCompany("Shopify Plus", userHistory),
  "Shopify"
);

// Test F: First-time company -> NOT in user history -> returns scraped as-is
assert.equal(
  findBestMatchingCompany("Acme Corp", userHistory),
  "Acme Corp"
);
assert.equal(
  findBestMatchingCompany("New Venture Partners", userHistory),
  "New Venture Partners"
);

// Test G: Empty history or empty input
assert.equal(findBestMatchingCompany("", userHistory), "");
assert.equal(findBestMatchingCompany("Google", []), "Google");

console.log("All companyMatcher check tests passed successfully!");
