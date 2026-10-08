using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Business.Entities;
using MediCare.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;

namespace MediCare.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class UsersController(ApplicationDbContext context, UserManager<User> userManager,IMapper mapper) : ControllerBase
    {
        // GET: api/Users
        [HttpGet]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            return await context.Users.ToListAsync();
        }

        // GET: api/Users/5
        [HttpGet("{id}")]
        public async Task<ActionResult<User>> GetUsers(int id)
        {
            var Users = await context.Users.FindAsync(id);

            if (Users == null)
            {
                return NotFound();
            }

            return Users;
        }

        // PUT: api/Users/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutUsers(int id, User Users)
        {
            if (id != Users.Id)
            {
                return BadRequest();
            }

            context.Entry(Users).State = EntityState.Modified;

            try
            {
                await context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!UsersExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // POST: api/Users
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<User>> PostUsers(User model)
        {
            var user = mapper.Map<User>(model);
           /* user.UserName = model.Email;
            user.EmailConfirmed = true;
            user.PhoneNumberConfirmed = true;
            user.AccessFailedCount = 0;
            user.TwoFactorEnabled = false;
            user.Id = Guid.NewGuid().ToString();
            */
            context.Users.Add(user);
            await context.SaveChangesAsync();
            return CreatedAtAction("GetUsers", new { id = user.Id }, user);
        }

        // DELETE: api/Users/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUsers(int id)
        {
            var Users = await context.Users.FindAsync(id);
            if (Users == null)
            {
                return NotFound();
            }

            context.Users.Remove(Users);
            await context.SaveChangesAsync();

            return NoContent();
        }

        private bool UsersExists(int id)
        {
            return context.Users.Any(e => e.Id == id);
        }
    }
}
