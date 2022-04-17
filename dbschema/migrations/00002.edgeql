CREATE MIGRATION m1fd4l5csnds3jjof7rfdaess2xggmucgadlnlvphgjc6yl6oeqnaq
    ONTO m1hkbp3eokywuhq7qvrvsz4wrcoj2lvh4g5hp4w77wfjtsuixerj2a
{
  CREATE ABSTRACT TYPE default::Document {
      CREATE REQUIRED LINK club -> default::Club;
      CREATE REQUIRED PROPERTY name -> std::str;
  };
  ALTER TYPE default::Club {
      CREATE MULTI LINK documents := (.<club[IS default::Document]);
  };
  CREATE TYPE default::PDF EXTENDING default::Document {
      CREATE REQUIRED PROPERTY url -> std::str;
  };
  CREATE TYPE default::User {
      CREATE REQUIRED PROPERTY display_name -> std::str;
  };
};
