CREATE MIGRATION m1yqnb2h3pejektjkbdbrgeb6rpcabdbnfcqhcckowy45dq7hswhxa
    ONTO m1fnspdrbvyyt5fz7cdnqu6yi4mglynmua56yi5iybkcdbwd6vjlxa
{
  CREATE ABSTRACT TYPE default::Identity {
      CREATE REQUIRED LINK user -> default::User {
          CREATE CONSTRAINT std::exclusive;
      };
  };
  ALTER TYPE default::GoogleIdentity EXTENDING default::Identity LAST;
  ALTER TYPE default::User {
      DROP LINK googleIdentity;
  };
  ALTER TYPE default::GoogleIdentity {
      ALTER LINK user {
          RESET OPTIONALITY;
          DROP OWNED;
          RESET TYPE;
      };
  };
  ALTER TYPE default::User {
      CREATE MULTI LINK identities := (.<user[IS default::Identity]);
  };
};
