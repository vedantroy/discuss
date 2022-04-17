CREATE MIGRATION m12wm6m42zb5zdnmx36glbvczdkpe5v2qq6rf7v5k4m4o4n76vkyya
    ONTO m1fd4l5csnds3jjof7rfdaess2xggmucgadlnlvphgjc6yl6oeqnaq
{
  CREATE TYPE default::Answer {
      CREATE REQUIRED LINK user -> default::User;
      CREATE REQUIRED PROPERTY content -> std::str;
  };
  CREATE TYPE default::Post {
      CREATE REQUIRED PROPERTY content -> std::str;
      CREATE REQUIRED PROPERTY score -> std::str;
      CREATE REQUIRED PROPERTY title -> std::str;
  };
  ALTER TYPE default::Answer {
      CREATE REQUIRED LINK post -> default::Post;
  };
  ALTER TYPE default::Post {
      CREATE MULTI LINK answers := (.<post[IS default::Answer]);
  };
  ALTER TYPE default::User {
      CREATE MULTI LINK answers := (.<user[IS default::Answer]);
  };
  CREATE TYPE default::Vote {
      CREATE REQUIRED LINK post -> default::Post;
      CREATE REQUIRED LINK user -> default::User;
      CREATE REQUIRED PROPERTY createdAt -> std::datetime;
      CREATE REQUIRED PROPERTY up -> std::bool;
  };
  ALTER TYPE default::Post {
      CREATE MULTI LINK votes := (.<post[IS default::Vote]);
  };
  ALTER TYPE default::User {
      CREATE MULTI LINK votes := (.<user[IS default::Vote]);
  };
  ALTER TYPE default::User {
      ALTER PROPERTY display_name {
          RENAME TO displayName;
      };
  };
};
