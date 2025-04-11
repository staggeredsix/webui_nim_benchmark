import { saveNgcKey, getNgcKey, deleteNgcKey } from "@/services/api"; // Corrected import

const NgcKeyManagement = () => {
  const handleSave = async (key: string) => {
    try {
      await saveNgcKey(key);
      console.log("NGC key saved successfully");
    } catch (error) {
      console.error("Error saving NGC key:", error);
    }
  };

  const handleGet = async () => {
    try {
      const key = await getNgcKey();
      console.log("NGC key retrieved:", key || "No key found");
    } catch (error) {
      console.error("Error retrieving NGC key:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteNgcKey();
      console.log("NGC key deleted successfully");
    } catch (error) {
      console.error("Error deleting NGC key:", error);
    }
  };

  return (
    <div>
      <h2>NGC Key Management</h2>
      <button onClick={() => handleSave("dummy-key")}>Save Key</button>
      <button onClick={handleGet}>Get Key</button>
      <button onClick={handleDelete}>Delete Key</button>
    </div>
  );
};

export default NgcKeyManagement;

