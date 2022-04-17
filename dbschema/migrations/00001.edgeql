CREATE MIGRATION m1hkbp3eokywuhq7qvrvsz4wrcoj2lvh4g5hp4w77wfjtsuixerj2a
    ONTO initial
{
  CREATE TYPE default::Club {
      CREATE REQUIRED PROPERTY name -> std::str;
  };
};
