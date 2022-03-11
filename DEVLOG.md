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
