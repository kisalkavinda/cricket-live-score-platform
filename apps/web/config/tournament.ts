export const tournamentConfig = {
  name: "[PLACEHOLDER TOURNAMENT NAME]", // e.g. "Soft Ball Championship 2026"
  tagline: "[PLACEHOLDER TAGLINE]",
  date: "[PLACEHOLDER DATE]",
  time: "[PLACEHOLDER TIME]",
  venue: "[PLACEHOLDER VENUE]",
  venueMapUrl: "#", // placeholder
  registrationFormUrl: "#", // placeholder google form URL
  registrationDeadline: "[PLACEHOLDER DEADLINE]",

  // Leave these open until registration closes
  format: "League + Knockout · overs & balls-per-over TBD",
  maxTeams: null,          // set once organizers confirm a cap, or leave null (open registration)
  teamsRegistered: null,   // wire to a live count once Phase 2 DB exists; null = "Registration open"

  entryFee: "[PLACEHOLDER ENTRY FEE]",
  contactEmail: "[PLACEHOLDER EMAIL]",
  contactPhone: "[PLACEHOLDER PHONE]",
  socials: { facebook: "#", instagram: "#" }
};
