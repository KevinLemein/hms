using MediCare.Mobile.Models;
using SQLite;
using System;
using System.Collections.Generic;
using System.Text;

namespace MediCare.Mobile.Data
{
    [SQLite.Preserve(AllMembers = true)]
    public class DataStore
    {
        public readonly SQLiteAsyncConnection _database;
        string dbPath = Constants.DatabaseFilePath;
        public DataStore()
        {
        
            try
            {
                _database = new SQLiteAsyncConnection(dbPath);
                _database.CreateTableAsync<ApplicationUser>().Wait();
            }
            catch (Exception ex)
            {
                var error=ex.ToString();
            }

            
        }
        public async Task<ApplicationUser> GetDefaultUser()
        {
            var user = await _database.Table<ApplicationUser>().FirstOrDefaultAsync();
            return user;
        }
    }

}
