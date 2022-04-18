CREATE MIGRATION m1o3inietrk5lmxazppn5uupjswwtkzggsvafn75t2knihlarhyfsq
    ONTO m1jmfwtkrx26mc4dsmlth4t6jmij56embmu3zlk6zoyi6fryafiuqa
{
  ALTER TYPE default::Club {
      CREATE REQUIRED PROPERTY shortId -> std::str {
          SET REQUIRED USING (SELECT
              'invalid-id'
          );
          CREATE CONSTRAINT std::exclusive;
      };
  };
  ALTER TYPE default::Document {
      CREATE CONSTRAINT std::exclusive ON ((.club, .name));
  };
  ALTER TYPE default::Post {
      CREATE REQUIRED PROPERTY shortId -> std::str {
          SET REQUIRED USING (SELECT
              'invalid-id'
          );
          CREATE CONSTRAINT std::exclusive;
      };
  };
  ALTER TYPE default::User {
      CREATE REQUIRED PROPERTY shortId -> std::str {
          SET REQUIRED USING (SELECT
              'invalid-id'
          );
          CREATE CONSTRAINT std::exclusive;
      };
  };
};
