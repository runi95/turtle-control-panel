declare module "assign-deep" {
  function assignDeep<T extends object, U extends object[]>(
    target: T,
    ...sources: U
  ): T & U[number];

  export = assignDeep;
}
