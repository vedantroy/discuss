CREATE MIGRATION m12hinpdpwed7motymfeyvrz3v4vhlwddhxgz6tuznj6smvmff6lcq
    ONTO initial
{
  CREATE ABSTRACT TYPE default::Votable;
  CREATE TYPE default::Answer EXTENDING default::Votable {
      CREATE REQUIRED PROPERTY content -> std::str;
      CREATE REQUIRED PROPERTY createdAt -> std::datetime;
  };
  CREATE ABSTRACT TYPE default::Post EXTENDING default::Votable {
      CREATE REQUIRED PROPERTY content -> std::str;
      CREATE REQUIRED PROPERTY createdAt -> std::datetime;
      CREATE REQUIRED PROPERTY shortId -> std::str {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE REQUIRED PROPERTY title -> std::str;
  };
  ALTER TYPE default::Answer {
      CREATE REQUIRED LINK post -> default::Post;
  };
  CREATE TYPE default::PDFRect {
      CREATE REQUIRED PROPERTY height -> std::int16;
      CREATE REQUIRED PROPERTY width -> std::int16;
      CREATE REQUIRED PROPERTY x -> std::int16;
      CREATE REQUIRED PROPERTY y -> std::int16;
  };
  ALTER TYPE default::Post {
      CREATE MULTI LINK answers := (.<post[IS default::Answer]);
  };
  CREATE TYPE default::PDFPost EXTENDING default::Post {
      CREATE REQUIRED LINK excerptRect -> default::PDFRect;
      CREATE MULTI LINK rects -> default::PDFRect;
      CREATE REQUIRED PROPERTY anchorIdx -> std::int16;
      CREATE REQUIRED PROPERTY anchorOffset -> std::int16;
      CREATE REQUIRED PROPERTY excerpt -> std::str;
      CREATE REQUIRED PROPERTY focusIdx -> std::int16;
      CREATE REQUIRED PROPERTY focusOffset -> std::int16;
      CREATE REQUIRED PROPERTY page -> std::int16;
  };
  CREATE TYPE default::User {
      CREATE REQUIRED PROPERTY createdAt -> std::datetime;
      CREATE REQUIRED PROPERTY displayName -> std::str;
      CREATE REQUIRED PROPERTY email -> std::str;
      CREATE PROPERTY image -> std::str;
      CREATE REQUIRED PROPERTY shortId -> std::str {
          CREATE CONSTRAINT std::exclusive;
      };
  };
  ALTER TYPE default::Answer {
      CREATE REQUIRED LINK user -> default::User;
  };
  ALTER TYPE default::User {
      CREATE MULTI LINK answers := (.<user[IS default::Answer]);
  };
  CREATE TYPE default::Vote {
      CREATE REQUIRED LINK votable -> default::Votable;
      CREATE REQUIRED PROPERTY up -> std::bool;
      CREATE REQUIRED LINK user -> default::User;
      CREATE CONSTRAINT std::exclusive ON ((.user, .votable));
      CREATE REQUIRED PROPERTY createdAt -> std::datetime;
  };
  ALTER TYPE default::Votable {
      CREATE MULTI LINK votes := (.<votable[IS default::Vote]);
      CREATE REQUIRED PROPERTY downVotes := (SELECT
          std::count((.<votable[IS default::Vote].up = false))
      );
      CREATE REQUIRED PROPERTY score := (SELECT
          std::sum((1 IF .<votable[IS default::Vote].up ELSE -1))
      );
      CREATE REQUIRED PROPERTY upVotes := (SELECT
          std::count((.<votable[IS default::Vote].up = true))
      );
  };
  CREATE TYPE default::Club {
      CREATE MULTI LINK users -> default::User;
      CREATE REQUIRED PROPERTY name -> std::str;
      CREATE REQUIRED PROPERTY public -> std::bool;
      CREATE REQUIRED PROPERTY shortId -> std::str {
          CREATE CONSTRAINT std::exclusive;
      };
  };
  CREATE ABSTRACT TYPE default::Document {
      CREATE REQUIRED LINK club -> default::Club;
      CREATE REQUIRED PROPERTY name -> std::str;
      CREATE REQUIRED PROPERTY shortId -> std::str {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE CONSTRAINT std::exclusive ON ((.club, .name));
  };
  ALTER TYPE default::Club {
      CREATE MULTI LINK documents := (.<club[IS default::Document]);
  };
  CREATE TYPE default::PDF EXTENDING default::Document {
      CREATE REQUIRED PROPERTY baseHeight -> std::int16;
      CREATE REQUIRED PROPERTY baseWidth -> std::int16;
      CREATE REQUIRED PROPERTY url -> std::str;
  };
  CREATE ABSTRACT TYPE default::Identity {
      CREATE REQUIRED LINK user -> default::User {
          CREATE CONSTRAINT std::exclusive;
      };
  };
  CREATE TYPE default::GoogleIdentity EXTENDING default::Identity {
      CREATE REQUIRED PROPERTY displayName -> std::str;
      CREATE REQUIRED PROPERTY email -> std::str;
      CREATE REQUIRED PROPERTY sub -> std::str {
          CREATE CONSTRAINT std::exclusive;
      };
  };
  ALTER TYPE default::User {
      CREATE MULTI LINK identities := (.<user[IS default::Identity]);
  };
  ALTER TYPE default::PDFPost {
      CREATE REQUIRED LINK document -> default::PDF;
  };
  ALTER TYPE default::PDF {
      CREATE MULTI LINK posts := (.<document[IS default::PDFPost]);
  };
  ALTER TYPE default::Post {
      CREATE REQUIRED LINK user -> default::User;
  };
  ALTER TYPE default::User {
      CREATE MULTI LINK posts := (.<user[IS default::Post]);
      CREATE MULTI LINK votes := (.<user[IS default::Vote]);
  };
};
