CREATE MIGRATION m1p7s5dsmgei7vuipw2zracqvk5n2ah6aznq75ralts2lsdlmx24iq
    ONTO m1jakeqsljxnxie44x6bfmegaw6bl7kv7awfjcn2m3j2bigt32kgra
{
  ALTER TYPE default::Answer {
      CREATE REQUIRED PROPERTY createdAt -> std::datetime {
          SET REQUIRED USING (SELECT
              <std::datetime>'1999-03-31T15:17:00Z'
          );
      };
  };
  ALTER TYPE default::Club {
      CREATE MULTI LINK users -> default::User;
  };
  ALTER TYPE default::Pair {
      DROP PROPERTY key;
  };
  ALTER TYPE default::Pair {
      DROP PROPERTY value;
  };
  CREATE TYPE default::PDFRect {
      CREATE REQUIRED PROPERTY height -> std::int16;
      CREATE REQUIRED PROPERTY width -> std::int16;
      CREATE REQUIRED PROPERTY x -> std::int16;
      CREATE REQUIRED PROPERTY y -> std::int16;
  };
  ALTER TYPE default::Post {
      SET ABSTRACT;
      CREATE REQUIRED LINK user -> default::User {
          SET REQUIRED USING (SELECT
              default::User 
          LIMIT
              1
          );
      };
      CREATE REQUIRED PROPERTY createdAt -> std::datetime {
          SET REQUIRED USING (SELECT
              <std::datetime>'1999-03-31T15:17:00Z'
          );
      };
  };
  CREATE TYPE default::PDFPost EXTENDING default::Post {
      CREATE REQUIRED LINK document -> default::PDF;
      CREATE REQUIRED MULTI LINK rects -> default::PDFRect;
      CREATE REQUIRED PROPERTY anchorIdx -> std::int16;
      CREATE REQUIRED PROPERTY anchorOffset -> std::int16;
      CREATE REQUIRED PROPERTY excerpt -> std::str;
      CREATE REQUIRED PROPERTY focusIdx -> std::int16;
      CREATE REQUIRED PROPERTY focusOffset -> std::int16;
      CREATE REQUIRED PROPERTY page -> std::int16;
  };
  ALTER TYPE default::PDF {
      CREATE MULTI LINK posts := (.<document[IS default::PDFPost]);
  };
  DROP TYPE default::Pair;
  ALTER TYPE default::User {
      CREATE MULTI LINK posts := (.<user[IS default::Post]);
      CREATE REQUIRED PROPERTY createdAt -> std::datetime {
          SET REQUIRED USING (SELECT
              <std::datetime>'1999-03-31T15:17:00Z'
          );
      };
  };
};
