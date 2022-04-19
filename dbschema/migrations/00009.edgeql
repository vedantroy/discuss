CREATE MIGRATION m1j7mr4fc2uxhgax4lrl6w4l74rvjqhqmyjr35fmhrwchblifnluga
    ONTO m1fu47f7cczy3he6cf27m2bfvstzypohbbzpreakilszvhlhytyzzq
{
  CREATE MODULE KV IF NOT EXISTS;
  CREATE TYPE KV::Pair {
      CREATE REQUIRED PROPERTY key -> std::str {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE REQUIRED PROPERTY value -> std::str;
  };
  ALTER TYPE default::User {
      DROP PROPERTY onboardingState;
  };
};
