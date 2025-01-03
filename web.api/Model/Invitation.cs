namespace aurga.Model
{
    public class Invitation
    {
        /// <summary>
        /// User.Id
        /// </summary>
        public long InvitedBy { get; set; }
        public required string EmailHash { get; set; }

        public required string Name { get; set; }
        public required string Email { get; set; }
        public string InvitationCode { get; set; }

        public DateTime InvitedAt { get; set; }
    }
}
