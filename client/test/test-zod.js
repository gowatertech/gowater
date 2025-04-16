import zod from "zod"; const testSchema = zod.object({ id: zod.coerce.number() }); console.log(testSchema.parse({id: "123"}));
