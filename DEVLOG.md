# 18-04-2022

I must say. remix is great.
Thinking about URL schemes & headers/footers right now:

- We shouldn't define headers/footers on child routes (unless they are exclusive to that route) b/c then we lose parallel loading
- Also the header should not mutate arbitrarily; I've never really seen a site do this.

I think the right thing to do is:

- show the header using the trick mentioned in GH discussions
- if the header does need to be customized, use useMatches + handles

This is better than defining the header for each child route b/c we'll have
all the header code in 1 place, since the header should be a single component
(& not multiple components that are themed to look identical)

Alright; let's define the URL scheme:

- $ROOT/q/:questionId
- $ROOT/c/:clubID
- $ROOT/u/:userID
- $ROOT/d/pdf/:docId
- $ROOT/d/pdf/:docId/submit
- $ROOT/login
- $ROOT/auth/:provider
  - Called to start OAuth login process
- $ROOT/auth/:provider/callback
  - The OAuth callback URL

# 17-04-2022

## STARTING HACK SESSION

- BE FAST BE DIRTY
- I"M DUMB AS SHIT. USING ORY KRATOS? REALLY?
- CLEARLY I SHOULD BE AS HACKY AS POSSIBLE; THE JOB IS TO SHIP CODE & SHIP IT FAST. I DO NOT WANT TO DIE BEING AN ORY KRATOS EXPERT. I WANT TO DIE HAPPY.

Auth is becoming a bit of a problem.
I'm getting blocked on it. I don't want to get blocked on auth.
Auth is not a real problem to solve.

I'm thinking of using a tool like Ory kratos.

I just want basic social login features; but it seems like remix-auth is not
good enough; e.g linking multiple auth accounts together

Wait. This is a startup. I should treat it as such.

Ok. Here's the plan. I'm going to try Ory kratos. I'm going to timebox it to 3 hours.
Why Ory Kratos?

- Having some level of control over the auth _could_ be good
  - Remix auth is giving me _too much control_ (I'm being forced to store different identities inside of my database, connecting them seems like too much work)
  - Firebase Auth seems pretty good; but might be good to try out Ory since it's a single, small binary

Otherwise, I'm going to use Firebase Auth + Remix

# 16-04-2022

## thesis

- We can make ultra-books by taking every question someone has and inlining it into the book
  - Legal document
  - HW assignments
  - Textbooks
- I want to add a social media aspect?
  - (is this crock-pot thinking ... like )
- The thing to do to combat crock-pot thinking is as follows

1. make hypothesis
2. test hypothesis
3. only implementing marketing features that are not _abstract_

Difference between social network & Q/A site?

- Primary purpose is Q&A, we want ultra-good learning platforms
- Social network exists for;

STOP THINKING IN ABSTRACT DRILL DOWN TO CONCRETE SCENARIOS! ALWAYS!
(counterpoint: not always bad to throw features in & see if cambrian explosion of unexpected interactions happen)

1st plan:

- Focus on intimate groups (personal book club)
  - Why?
    1. Potential explosion of growth if people upload illegal content to read with friends
    2. **That's what we need for the summer**

1st concrete scenario:

- ZK summer group
  - Objective: To understand the entire ZK tech stack
  - Care about social? no
    - Possibly to see who the other interesting ZK people are
    - Already known b/c are in shared book club
  - Experience: small, intimate
  -
- User book club
  - pass
- Piracy

more vague thoughts:

- learning is inherently collaborative ...
  - you are trying to understand the same thing; there is high intellectual compatability; good become dating site LMAOOO
-

Data model (**this startup is kind of just a discord feature**):

- Clubs can contain multiple documents
- People must join clubs to read the contained documents
- Public clubs (have a public invite link) and private clubs (specialized invite link)
- Public & Private can reference public posts directly
- if a post is deleted, ignore tht problem for now
- You can see posts at a top level
- ## You can link to (public) posts at a top level

Ok. More thoughts. I fucking. hate. SQL.
See: https://stackoverflow.com/questions/71898968/how-to-query-parent-child-table-in-one-query

This is a startup. My job is not to do SQL.
I guess think about it like this. I have a finite amount of time on this earth.
I do not want to spend this time on earth developing this application. I want to spend it hanging out! Spending time developing this application is _necessary cost_. I should ship as fast as possible.

At the same time, I want to be happy. & writing unclean SQL makes me very not happy. I should just use edgedb. Restrict the entire data layer to a "data.ts" file (or something like that). If I stick all queries in there, then I should be golden.

It is not worth learning SQL. I do not want a job where I become a SQL monkey. I'll just use edgedb & then if at some point it breaks I'll deal with the clusterfuck. But roughly; I expect edgedb to be good for my first 500K users and if I have to migrate then, that's fine. It'll be annoying but doable I think.

url scheme:

DB Schema 2:

```
model Club {
  club_id
  name: string
  public: bool
  members: Users[]
  documents: Document[]
}

model Document {
  document_id
  name: string
  type: DocumentType
}

// Reference table
model DocumentType {
  type_id
  name: string
}
```

---

Writing out DB scheme. Going to keep it fast & sloppy while I iterate:
Supabase reasoning: It's like Mongo but better

- terrible, untyped developer experience
- but super fast dev ex
- it's pg-based (unlike mongo) so we can switch to prisma w/o too much issue later

```
// think about what to store
// e.g -- we probably want to store individual votes
// (calculate fraud, see what someone voted on, etc.)
// avoid computed columns -- we can cache em later
// MVP this shit ...
// I want rust style enums in a database !!

model User {
  displayName: string
  description: string
  // the other fields we care about ...

  votes: Vote[]
}

model Posts {
  title: string;
  content: string;
  score: number;
  vote: Vote[]
}

model Comments {
}

model Answers {
  content: string;
  post: PostId
  vote: Vote[]
}

model Votes {
  id: Id
  userId: UserId
  postId: PostId
  time: Time
  up: bool
  //voteType: VoteTypeId
}

//model VoteType {
//  id: VoteTypeId
//}
```

# 03-04-2022

- I feel bad about my regexp based solution to commenting. why?
  - I didn't plan it out at all. So I lacked the necessary information & now I realize it won't work.

# 09-03-2022

- EDD:
  - 1st idx in array go: none -> render -> none

# 08-03-2022

- Starting first push on PDFViewer (writing out all components, etc.)
  - going to try expect-driven-development:
    - write what I expect to happen
    - diff the expectations
  - this should promote greater understanding of my own code...
  - expect:
    - setting render called _after_ `console.timeEnd("load")`
    - all pages should exist in `pages`

# 27-02-2022

- I finally realized that tests are pull-based but application code can be either pull or push based (simpler as push based)
- I wrote async iterators to solve this issue, but ...
  - I'm 99% sure I over-engineered
    - 30% chance I could have gotten away w/o any iterators but slightly sloppier test code
    - 68% chance I should have
      1. not implemented gc of iterators
      2. should have just not used the ensureFinished tests and stuck with the basic `pull` tests
    - The remaining 1% is just b/c the PDF viewer must be very correct & writing super correct code seems good
      - But I should **not** have written code based on this 1% assumption
      - Test code needs to be maintained too
- Update: I caught 1 bug with my tests. But ...
  - That's 1 bug after 3/4 hrs spent writing tests. This seems bad ??
  - It was a major bug
  - We will see if I catch more bugs as I add more features

# 22-02-2022

- I spent more time writing test code than actual code
  - This seems bad ??
- I do to much back-tracking while coding
  - For example: I added the test feature to collect all the times a callback is called but afterwards I realized the API should just pass an array w/ the pages render/destroy in order of priority
  - What's the signal here?
    - When something seems unnecessarily complicated: ask does it need to be done this way?
    - Write the tests first since tests will expose the ideal API

# 23-02-2022

- Going to write test out fully before I start refactoring
