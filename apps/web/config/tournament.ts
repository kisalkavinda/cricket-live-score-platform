export const tournamentConfig = {
  name: "Computing Premier League",
  shortName: "CPL",
  tagline: "The Biggest Cricket Event Where Passion Meets Glory",
  date: "September 13, 2026",
  time: "8:00 AM",
  venue: "Ratmalana CGR Ground (Ratmalana United S.C)",
  venueMapUrl: "https://maps.app.goo.gl/Fb1oVkBWfnBFj1DbA",
  venueEmbedUrl: "https://maps.google.com/maps?q=Ratmalana+CGR+Ground+(Ratmalana+United+S.C)&t=&z=15&ie=UTF8&iwloc=&output=embed",
  registrationOpen: false,
  registrationStatus: "CLOSED",
  registrationFormUrl: null,
  registrationDeadline: "August 31, 2026",

  // Leave these open until registration closes
  format: "League + Knockout · overs & balls-per-over TBD",
  maxTeams: null,
  teamsRegistered: null,

  contactPhones: ["+94 75 086 9776", "+94 75 360 2181"],
  captainsWhatsappGroupUrl: "https://chat.whatsapp.com/BbdQ3ZlmjH0G6inbsFXhOb",

  // Official Match Rules & Tournament Information
  rules: [
    {
      id: "bowling-limits",
      title: "Bowling Limits",
      description: "Maximum 1 over per bowler per match.",
      badge: "1 Over / Bowler",
      icon: "🎯",
    },
    {
      id: "no-ball",
      title: "No Ball",
      description: "Any delivery above chest height. Grants +1 run and an extra delivery. No Free Hit after a No Ball. Chucking / illegal bowling action strictly prohibited and called as a No Ball.",
      badge: "+1 Run · No Free Hit",
      icon: "🚫",
    },
    {
      id: "wide-ball",
      title: "Wide Ball",
      description: "Delivery outside batter's reasonable hitting reach. Grants +1 run and an extra delivery.",
      badge: "+1 Run · Extra Delivery",
      icon: "↔️",
    },
    {
      id: "boundary-fielding",
      title: "Boundary Fielding",
      description: "Maximum 3 fielders on leg side, maximum 2 fielders on off side.",
      badge: "3 Leg · 2 Off",
      icon: "🛡️",
    },
    {
      id: "authority",
      title: "Authority",
      description: "Umpire's decision is final. Overs and balls per over may be adjusted according to match time.",
      badge: "Umpire Final",
      icon: "⚖️",
    },
    {
      id: "points-standings",
      title: "Points & Standings",
      description: "Win = 2 pts, Tie = 1 pt, Loss = 0 pts. Minimum 2 matches per team in league stage. Points rank teams; Net Run Rate (NRR) breaks ties.",
      badge: "W: 2 · T: 1 · L: 0",
      icon: "📊",
    },
    {
      id: "provided-by-committee",
      title: "Provided by Organizing Committee",
      description: "Refreshments, T4 match balls, Lunch, Post-match DJ party.",
      badge: "Hospitality & Gear",
      icon: "🎉",
    },
    {
      id: "awards",
      title: "Awards",
      description: "1st Place Trophy, 2nd Place Trophy, Best Batsman (Most Runs), Best Bowler (Most Wickets), Man of the Final (Best performance by Batter or Bowler).",
      badge: "Trophies & Honors",
      icon: "🏆",
    },
  ],
};

