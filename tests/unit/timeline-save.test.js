import { useTimelineSave } from "@/composables/useTimelineSave";
import axios from "@/axios";

jest.mock("@/axios", () => ({ put: jest.fn(), post: jest.fn(), delete: jest.fn() }));

beforeEach(() => jest.resetAllMocks());

test("failed record save never deletes original media and permits retry", async () => {
  const flow = useTimelineSave("history");
  axios.put.mockRejectedValueOnce(new Error("save failed"));
  await expect(flow.save({ id: 1 }, true, ["/old.jpg"])).rejects.toThrow("save failed");
  expect(axios.delete).not.toHaveBeenCalled();
  expect(flow.saving.value).toBe(false);
  axios.put.mockResolvedValueOnce({ data: { id: 1 } });
  axios.delete.mockResolvedValueOnce({});
  await expect(flow.save({ id: 1 }, true, ["/old.jpg"])).resolves.toMatchObject({ cleanupFailed: false });
});

test.each(["history", "dating"])("%s cleanup waits for persistence and blocks duplicate submits", async (domain) => {
  let resolveSave;
  axios.put.mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve; }));
  axios.delete.mockResolvedValue({});
  const flow = useTimelineSave(domain);
  const pending = flow.save({ id: 1 }, true, ["/old.jpg", "/old.jpg"]);
  expect(flow.saving.value).toBe(true);
  expect(axios.delete).not.toHaveBeenCalled();
  expect(await flow.save({ id: 1 }, true, ["/old.jpg"])).toBeNull();
  expect(axios.put).toHaveBeenCalledTimes(1);
  resolveSave({ data: { id: 1 } });
  await pending;
  expect(axios.delete).toHaveBeenCalledTimes(1);
  expect(axios.delete).toHaveBeenCalledWith(
    domain === "history" ? "/api/histories/media" : "/api/dating/image",
    { params: { [domain === "history" ? "mediaPath" : "imagePath"]: "/old.jpg" } },
  );
});

test("cleanup failure is distinguished from a failed save", async () => {
  axios.post.mockResolvedValue({ data: { id: 2 } });
  axios.delete.mockRejectedValue(new Error("cleanup failed"));
  const flow = useTimelineSave("history");
  await expect(flow.save({}, false, ["/new-unused.jpg"])).resolves.toEqual({
    record: { id: 2 }, cleanupFailed: true,
  });
  expect(flow.saving.value).toBe(false);
});
