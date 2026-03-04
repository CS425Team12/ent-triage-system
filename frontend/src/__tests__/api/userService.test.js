import UserService, { userService } from "../../api/userService";
import apiClient from "../../api/axios";

jest.mock("../../api/axios");

describe("UserService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllUsers", () => {
    it("should fetch all users", async () => {
      const mockUsers = [
        { id: 1, name: "John", email: "john@example.com" },
        { id: 2, name: "Jane", email: "jane@example.com" },
      ];
      apiClient.get.mockResolvedValue({ data: mockUsers });

      const result = await userService.getAllUsers();

      expect(apiClient.get).toHaveBeenCalledWith("users/");
      expect(result).toEqual(mockUsers);
    });
  });

  describe("getUserById", () => {
    it("should fetch a user by ID", async () => {
      const mockUser = { id: 1, name: "John", email: "john@example.com" };
      apiClient.get.mockResolvedValue({ data: mockUser });

      const result = await userService.getUserById(1);

      expect(apiClient.get).toHaveBeenCalledWith("/users/1");
      expect(result).toEqual(mockUser);
    });
  });

  describe("createUser", () => {
    it("should create a new user", async () => {
      const userData = {
        name: "John",
        email: "john@example.com",
        role: "USER",
      };
      const mockResponse = { id: 1, ...userData };
      apiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await userService.createUser(userData);

      expect(apiClient.post).toHaveBeenCalledWith("/users", userData);
      expect(result).toEqual(mockResponse);
    });

    it("should pass all fields to the API", async () => {
      const userData = {
        name: "Jane",
        email: "jane@example.com",
        role: "ADMIN",
        active: true,
      };
      apiClient.post.mockResolvedValue({ data: { id: 2, ...userData } });

      await userService.createUser(userData);

      expect(apiClient.post).toHaveBeenCalledWith("/users", userData);
    });
  });

  describe("updateUser", () => {
    it("should update a user", async () => {
      const updateData = { name: "Jane Updated" };
      const mockResponse = {
        id: 1,
        name: "Jane Updated",
        email: "jane@example.com",
      };
      apiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await userService.updateUser(1, updateData);

      expect(apiClient.patch).toHaveBeenCalledWith("/users/1", updateData);
      expect(result).toEqual(mockResponse);
    });

  });
});
