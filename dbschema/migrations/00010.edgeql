CREATE MIGRATION m1fnspdrbvyyt5fz7cdnqu6yi4mglynmua56yi5iybkcdbwd6vjlxa
    ONTO m1j7mr4fc2uxhgax4lrl6w4l74rvjqhqmyjr35fmhrwchblifnluga
{
  ALTER TYPE KV::Pair RENAME TO default::Pair;
  DROP MODULE KV;
};
