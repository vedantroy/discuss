CREATE MIGRATION m12cg3yljgxe3mtx6vzzqkrng6qhbvmh5fwrxgwimtuntpkgoiiqea
    ONTO m1yqnb2h3pejektjkbdbrgeb6rpcabdbnfcqhcckowy45dq7hswhxa
{
  ALTER TYPE default::User {
      CREATE PROPERTY image -> std::str;
  };
};
