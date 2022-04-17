CREATE MIGRATION m1hvs272ll2uk2b24ahzplgaq2f6w45af5fyuhr5yqgd7flziobtaa
    ONTO m1hx75ubjk25aixjupbplgwbmhwplesjgfmwpnhr4li6lt7cnyadza
{
  CREATE TYPE default::GoogleIdentity {
      CREATE REQUIRED PROPERTY displayName -> std::str;
      CREATE REQUIRED PROPERTY email -> std::str;
      CREATE REQUIRED PROPERTY sub -> std::str {
          CREATE CONSTRAINT std::exclusive;
      };
  };
};
