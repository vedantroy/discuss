CREATE MIGRATION m1jakeqsljxnxie44x6bfmegaw6bl7kv7awfjcn2m3j2bigt32kgra
    ONTO m12cg3yljgxe3mtx6vzzqkrng6qhbvmh5fwrxgwimtuntpkgoiiqea
{
  ALTER TYPE default::User {
      CREATE REQUIRED PROPERTY email -> std::str {
          SET REQUIRED USING ('');
      };
  };
};
