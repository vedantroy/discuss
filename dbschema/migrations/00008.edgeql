CREATE MIGRATION m1fu47f7cczy3he6cf27m2bfvstzypohbbzpreakilszvhlhytyzzq
    ONTO m1o3inietrk5lmxazppn5uupjswwtkzggsvafn75t2knihlarhyfsq
{
  ALTER TYPE default::User {
      CREATE REQUIRED PROPERTY onboardingState -> std::int16 {
          SET REQUIRED USING (0);
      };
  };
};
