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
    public class DoctorsController(ApplicationDbContext context) : ControllerBase
    {
        // GET: api/Doctor
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DoctorVm>>> GetDoctor()
        {
            return await context.Doctors
                .Include(i=>i.User)
                .Include(i=>i.Speciality)
                .Select(i=>new DoctorVm
                {
                    Id = i.Id,
                    FirstName = i.User.FirstName,
                    LastName = i.User.LastName,
                    Speciality = i.Speciality.Name,
                    IsAvailable = i.IsAvailable
                })
                .ToListAsync();
        }

        // GET: api/Doctor/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Doctor>> GetDoctor(int id)
        {
            var Doctor = await context.Doctors.FindAsync(id);

            if (Doctor == null)
            {
                return NotFound();
            }

            return Doctor;
        }

        // PUT: api/Doctor/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutDoctor(int id, Doctor Doctor)
        {
            if (id != Doctor.Id)
            {
                return BadRequest();
            }

            context.Entry(Doctor).State = EntityState.Modified;

            try
            {
                await context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!DoctorExists(id))
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

        // POST: api/Doctor
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<Doctor>> PostDoctor(Doctor Doctor)
        {
            context.Doctors.Add(Doctor);
            await context.SaveChangesAsync();

            return CreatedAtAction("GetDoctor", new { id = Doctor.Id }, Doctor);
        }

        // DELETE: api/Doctor/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDoctor(int id)
        {
            var Doctor = await context.Doctors.FindAsync(id);
            if (Doctor == null)
            {
                return NotFound();
            }

            context.Doctors.Remove(Doctor);
            await context.SaveChangesAsync();

            return NoContent();
        }

        private bool DoctorExists(int id)
        {
            return context.Doctors.Any(e => e.Id == id);
        }
    }
}
