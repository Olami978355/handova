export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

// Add a new entry to the top of this array whenever a meaningful set of
// features ships. `version` just needs to change for returning users to
// see the banner again — a date string works fine.
export const changelog: ChangelogEntry[] = [
  {
    version: '2026-07-27',
    date: 'July 2026',
    title: "What's New on RentEasy",
    items: [
      'Find an Agent or Landlord — browse and search verified agents/landlords directly',
      'Leave a review after a deal completes, and see ratings on public profiles',
      'Delegates can now be revoked, and "My Delegates" shows every relationship in one place',
      'Faster delegate invites with live username search',
    ],
  },
];

export const latestChangelogVersion = changelog[0]?.version || '';
