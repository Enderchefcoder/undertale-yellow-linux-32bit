EnsureDataLoaded();
// GMS2 starts the game at GeneralInfo.RoomOrder[0], not data.Rooms[0].
UndertaleRoom battleRoom = null;
foreach (var r in Data.Rooms)
{
    if (r.Name.Content == "rm_battle") { battleRoom = r; break; }
}
if (battleRoom != null)
{
    foreach (var list in new UndertaleModLib.Models.UndertaleGeneralInfo[] { Data.GeneralInfo })
    {
        var order = list.RoomOrder;
        // Move rm_battle to the front of RoomOrder.
        int idx = -1;
        for (int i = 0; i < order.Count; i++)
        {
            if (order[i] != null && order[i].Resource != null && order[i].Resource.Name.Content == "rm_battle") { idx = i; break; }
        }
        if (idx >= 0)
        {
            var item = order[idx];
            order.RemoveAt(idx);
            order.Insert(0, item);
        }
    }
    // Keep data.Rooms consistent too.
    Data.Rooms.Remove(battleRoom);
    Data.Rooms.Insert(0, battleRoom);
    System.Console.WriteLine("SWAPPED: rm_battle is now RoomOrder[0]");
}
else
{
    System.Console.WriteLine("ERROR: rm_battle not found");
}
System.Console.WriteLine("ROOMORDER[0]=" + Data.GeneralInfo.RoomOrder[0].Resource.Name.Content);
System.Console.WriteLine("ROOMORDER[1]=" + Data.GeneralInfo.RoomOrder[1].Resource.Name.Content);
