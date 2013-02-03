# Requirements

- Recruiter given a nation from a source on page load
- Recruiters grouped by region
- Recruiters shouldn't see anything suggesting other regions
  are even on the program
- No region of recruiters is ever given the same nation twice
- Newer nations to a source appear higher up in the list
- Totals recruited by each recruiter for previous week given
  on results page, to be seen only by admin for region
- Current running total for given recruiter shown
- Nations should be searchable with recruiter, source region and
  date shown if recruited
- Recruiter should be able to save TG for sending that inputs nation
  name automatically
- Region admin should be able to set default TG

# Design

## Front End
- Site only visible to logged in users
- Should present login screen to non-logge users.

### Navigation
- Should have links to sources
- Should have link to root page
- Should have link to profile page
- Should display stats

### Root Page
- Should see number of recruitable nations in each source
- Should see some stats about current progress
- Should see some stats about other recruiters

### Profile Page
- Should be able to edit username and password from here
- Should be able to edit TGs here

### Recruitment Page
- Should be given new nation on load
- Should be able to say whether this nation was recruited or ignored
- Should be able to edit source specific TG from here

### Admin Root
- Should have navigation to adminny stuff
- - Create new users
- - View recruitment totals
- - Get recruitment data for a given nation


## Back End
### Nation Database
#### Requirements
- Should keep track of all recruited and recruitable nations
- Should be able to provide a nation on demand, and ensure
  that a nation is never provided to the same region twice
- Nations provided should reside in a requested source
- Priority should be given to newly created (or refounded) nations
- Should be able to track nations recruited by a region, and
  say when they were recruited, the region they were recruited from
  and who recruited them
- Should be able to return the number of nations recruited by
  a recruiter in a given timeframe (required granularity is a week,
  required update time is ASAP)
- Should be able to return a list, in order, of recruiters and numbers
  in a given timeframe. (required granularity is a week)
- Will likely use Redis for Nation lists and CouchDB for permanent
  storage and regional metrics

#### Design
- Methods
- - new({date, source, recruiter, id=nation_name})
- - getRecruitable(source)
- - save
- - find
- - stats(start date, end date)

- Update Loops
- - Every 30 seconds do
        for each source do
            source_nations = get(nations in source)
            new_nations    = get(new nations in source)
            recruited_nations = get(new_nations in database)
            new_nations    = intersection(new_nations, source_nations)
            new_nations    = difference(new_nations, recruited_nations)
            recruitable_nations = union(new_nations, recruitable_nations)
            recruitable_nations = intersection(
                recruitable_nations, source_nations
            )
- - get(nations in source) will be implemented through the NSAPI
- - get(new nations in source) will be implemented by newnations list
    in NSAPI for the feeders while it will just be the first 150 nations
    from the source for the sinkers.
- - get(new_nations in database) will be a call to CouchDB.
- - intersections, differences and unions will all be done in Redis using
    sorted groups.
- - When new_nations are uploaded, they will be given the current timestamp

### User Database
- Fields
- - ID
- - Username
- - Password
- - Region
- - IsAdmin
- - IsDeleted
- - TG
- - - source1, source2
- Should be creatable only by a regional admin
- Should be destroyable by regional admin and user
- Can likely put this on Redis
