CREATE MIGRATION m1jmfwtkrx26mc4dsmlth4t6jmij56embmu3zlk6zoyi6fryafiuqa
    ONTO m1hvs272ll2uk2b24ahzplgaq2f6w45af5fyuhr5yqgd7flziobtaa
{
  ALTER TYPE default::GoogleIdentity {
      CREATE REQUIRED LINK user -> default::User {
          SET REQUIRED USING (SELECT
              default::User FILTER
                  (default::User.id = <std::uuid>'00000000-0000-0000-0000-000000000000')
          LIMIT
              1
          );
      };
  };
  ALTER TYPE default::User {
      CREATE LINK googleIdentity := (.<user[IS default::GoogleIdentity]);
  };
};
