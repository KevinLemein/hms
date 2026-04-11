using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Business.Entities;
using MediCare.Data;
using Microsoft.AspNetCore.Authorization;

namespace MediCare.Controllers
{
    [Route("api/[controller]")]
    [AllowAnonymous]
    [ApiController]
    public class AppointmentStatusController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AppointmentStatusController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/AppointmentStatus
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AppointmentStatus>>> GetAppointmentStatus()
        {
            return await _context.AppointmentStatus.ToListAsync();
        }

        // GET: api/AppointmentStatus/5
        [HttpGet("{id}")]
        public async Task<ActionResult<AppointmentStatus>> GetAppointmentStatus(int id)
        {
            var AppointmentStatus = await _context.AppointmentStatus.FindAsync(id);

            if (AppointmentStatus == null)
            {
                return NotFound();
            }

            return AppointmentStatus;
        }

        // PUT: api/AppointmentStatus/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutAppointmentStatus(int id, AppointmentStatus AppointmentStatus)
        {
            if (id != AppointmentStatus.Id)
            {
                return BadRequest();
            }

            _context.Entry(AppointmentStatus).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!AppointmentStatusExists(id))
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

        // POST: api/AppointmentStatus
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<AppointmentStatus>> PostAppointmentStatus(AppointmentStatus AppointmentStatus)
        {
            _context.AppointmentStatus.Add(AppointmentStatus);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetAppointmentStatus", new { id = AppointmentStatus.Id }, AppointmentStatus);
        }

        // DELETE: api/AppointmentStatus/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAppointmentStatus(int id)
        {
            var AppointmentStatus = await _context.AppointmentStatus.FindAsync(id);
            if (AppointmentStatus == null)
            {
                return NotFound();
            }

            _context.AppointmentStatus.Remove(AppointmentStatus);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool AppointmentStatusExists(int id)
        {
            return _context.AppointmentStatus.Any(e => e.Id == id);
        }
    }
}
