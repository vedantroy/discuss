CREATE MIGRATION m1hx75ubjk25aixjupbplgwbmhwplesjgfmwpnhr4li6lt7cnyadza
    ONTO m12wm6m42zb5zdnmx36glbvczdkpe5v2qq6rf7v5k4m4o4n76vkyya
{
  ALTER TYPE default::Document {
      CREATE REQUIRED PROPERTY shortId -> std::str {
          SET REQUIRED USING ('invalid-id');
          CREATE CONSTRAINT std::exclusive;
      };
  };
};
